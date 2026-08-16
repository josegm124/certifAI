const RANK={aware:1,aligned:2,assured:3,advanced:4};
const PRODUCTS=[['aligned-certificate','aligned'],['assured-certificate','assured'],['advanced-certificate','advanced']];
class EligibilityService {
  products(resultLevelId, flags) { if(flags.some(f=>Number(f.failed)===1)) return []; return PRODUCTS.filter(([,l])=>RANK[l]<=RANK[resultLevelId]).map(([id])=>id); }
  describe(level,flags) { const eligibleProducts=this.products(level,flags); return { eligible:eligibleProducts.length>0, blockedByRedFlags:flags.some(f=>Number(f.failed)===1), eligibleProducts }; }
}
module.exports=EligibilityService;
