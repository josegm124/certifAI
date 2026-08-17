const express = require('express');
const TokenService = require('../services/TokenService');
const createAuthMiddleware = require('../middleware/auth');
const logger = require('../config/logger');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: TokenService.MAX_AGE_MS,
  path: '/',
});

const createRoutes = ({ authService, tokenService, userRepository, assessmentService, assessmentDashboardService, domainAnswerService, finalizationService, badgeService, certificateCatalogService, redFlagRepository, eligibilityService, dossierService, remediationService }) => {
  const router = express.Router();
  const authenticate = createAuthMiddleware(tokenService);

  router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  router.get('/catalog/certificates', async (_req, res, next) => {
    try { res.json(await certificateCatalogService.getPublicCatalog()); }
    catch (error) { next(error); }
  });

  router.post('/auth/register', async (req, res, next) => {
    try {
      const { user, profile } = await authService.register(req.body || {});
      res.cookie(TokenService.COOKIE_NAME, tokenService.sign(user), cookieOptions());
      res.status(201).json({ profile });
    } catch (error) { next(error); }
  });

  router.post('/auth/login', async (req, res, next) => {
    try {
      const { user, profile } = await authService.login(req.body?.email, req.body?.password);
      res.cookie(TokenService.COOKIE_NAME, tokenService.sign(user), cookieOptions());
      res.json({ profile });
    } catch (error) { next(error); }
  });

  router.post('/auth/logout', (_req, res) => {
    logger.audit.info({ event: 'account.logout' });
    res.clearCookie(TokenService.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  });

  router.get('/auth/me', authenticate, async (req, res, next) => {
    try { res.json({ profile: await authService.profile(req.auth.sub) }); }
    catch (error) { next(error); }
  });

  router.put('/profile', authenticate, async (req, res, next) => {
    try { res.json({ profile: await authService.updateProfile(req.auth.sub, req.body || {}) }); }
    catch (error) { next(error); }
  });

  router.post('/assessments', authenticate, async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.auth.sub);
      res.status(201).json({ assessment: await assessmentService.create(user, req.body || {}) });
    } catch (error) { next(error); }
  });

  router.get('/assessments/active', authenticate, async (req, res, next) => {
    try { res.json({ assessment: await assessmentService.active(req.auth.sub) }); }
    catch (error) { next(error); }
  });

  router.get('/assessments', authenticate, async (req, res, next) => {
    try { res.json({ assessments: await assessmentService.list(req.auth.sub) }); }
    catch (error) { next(error); }
  });

  router.get('/assessments/:id/dashboard', authenticate, async (req, res, next) => {
    try { res.json(await assessmentDashboardService.get(req.auth.sub, req.params.id)); }
    catch (error) { next(error); }
  });

  router.get('/assessments/:id', authenticate, async (req, res, next) => {
    try {
      const assessment = await assessmentService.requireOwned(req.params.id, req.auth.sub);
      res.json({ assessment: await assessmentService.detail(assessment) });
    } catch (error) { next(error); }
  });

  router.put('/assessments/:id/domains/:domainId/answers', authenticate, async (req, res, next) => {
    try { res.json(await domainAnswerService.save(req.auth.sub, req.params.id, req.params.domainId, req.body || {})); }
    catch (error) { next(error); }
  });

  router.post('/assessments/:id/finalize', authenticate, async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.auth.sub);
      res.json(await finalizationService.finalize(user, req.params.id, req.body || {}));
    } catch (error) { next(error); }
  });

  router.get('/assessments/:id/result', authenticate, async (req, res, next) => {
    try {
      const assessment = await assessmentService.requireOwned(req.params.id, req.auth.sub);
      if (assessment.status !== 'finalized') return res.status(409).json({ error: 'Assessment is not finalized', code: 'ASSESSMENT_NOT_FINALIZED' });
      const user = await userRepository.findById(req.auth.sub);
      res.json(await finalizationService.result(assessment, user.companyId));
    } catch (error) { next(error); }
  });

  router.get('/assessments/:id/certificate-options', authenticate, async (req, res, next) => {
    try {
      const assessment = await assessmentService.requireOwned(req.params.id, req.auth.sub);
      if (assessment.status !== 'finalized') {
        return res.status(409).json({ error: 'Assessment is not finalized', code: 'ASSESSMENT_NOT_FINALIZED' });
      }
      const [flags, catalog] = await Promise.all([
        redFlagRepository.byAssessment(assessment.id),
        certificateCatalogService.getPublicCatalog(),
      ]);
      const activeProductIds = catalog.products.map((product) => product.id);
      const certificateEligibility = eligibilityService.describe(assessment.resultLevelId, flags, activeProductIds);
      const eligibleProducts = catalog.products.filter((product) => certificateEligibility.eligibleProductIds.includes(product.id));
      res.json({ adoptionStage: assessment.adoptionStage, certificateEligibility, eligibleProducts });
    } catch (error) { next(error); }
  });
  router.post('/assessments/:id/remediation',authenticate,async(req,res,next)=>{try{const user=await userRepository.findById(req.auth.sub);res.status(201).json({assessment:await remediationService.create(user,req.params.id)});}catch(e){next(e);}});
  router.post('/assessments/:id/evidence-dossier',authenticate,async(req,res,next)=>{try{const user=await userRepository.findById(req.auth.sub);res.status(201).json(await dossierService.create(user,req.params.id,String(req.body?.selectedProductId||req.body?.productId||'')));}catch(e){next(e);}});
  router.get('/evidence-dossiers/:id',authenticate,async(req,res,next)=>{try{res.json(await dossierService.detail(req.auth.sub,req.params.id));}catch(e){next(e);}});
  router.put('/evidence-dossiers/:id/items/:questionId',authenticate,async(req,res,next)=>{try{res.json(await dossierService.saveItem(req.auth.sub,req.params.id,req.params.questionId,req.body?.writtenReference??req.body?.reference));}catch(e){next(e);}});
  router.post('/evidence-dossiers/:id/items/:questionId/attachment',authenticate,(req,res,next)=>upload.single('file')(req,res,(err)=>err?next(Object.assign(err,{status:err.code==='LIMIT_FILE_SIZE'?413:400,code:err.code==='LIMIT_FILE_SIZE'?'ATTACHMENT_TOO_LARGE':'ATTACHMENT_TYPE_NOT_ALLOWED'})):next()),async(req,res,next)=>{try{if(!req.file)return res.status(400).json({error:'Attachment is required',code:'ATTACHMENT_REQUIRED'});res.json(await dossierService.attach(req.auth.sub,req.params.id,req.params.questionId,req.file));}catch(e){next(e);}});
  router.get('/evidence-dossiers/:id/items/:questionId/attachment',authenticate,async(req,res,next)=>{try{const f=await dossierService.download(req.auth.sub,req.params.id,req.params.questionId);res.type(f.mime).download(f.path,f.name);}catch(e){next(e);}});
  router.delete('/evidence-dossiers/:id/items/:questionId/attachment',authenticate,async(req,res,next)=>{try{res.json(await dossierService.removeAttachment(req.auth.sub,req.params.id,req.params.questionId));}catch(e){next(e);}});
  const finalizeDossier = async (req, res, next) => { try { const user=await userRepository.findById(req.auth.sub);res.json(await dossierService.issue(user,req.params.id,req.body||{})); } catch (e) { next(e); } };
  router.post('/evidence-dossiers/:id/finalize', authenticate, finalizeDossier);
  router.post('/evidence-dossiers/:id/issue', authenticate, finalizeDossier);

  router.get('/badges/:token/verify', async (req, res, next) => {
    try {
      const badge = await badgeService.verifyBadge(req.params.token);
      if (!badge || !badgeService.getBadgeMetadata(badge.tier)) return res.status(404).json({ valid: false, error: 'Badge not found or expired' });
      res.json({ valid: true, badge, metadata: badgeService.getBadgeMetadata(badge.tier) });
    } catch (error) { next(error); }
  });

  return router;
};

module.exports = { createRoutes };
