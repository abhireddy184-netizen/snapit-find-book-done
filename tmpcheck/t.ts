import { matchServiceIntent } from "../src/lib/search-intent";
const cases = ["pedicure","manicure","waxing","hair removal","makeup","makeup artist","blowout","lash","brows","lash and brow","tv mounting","mount tv","ceiling fan installation","install ceiling fan","lawn mowing","refrigerator repair","fridge repair","sofa repair","couch repair","plumber","beauty","electrician","cleaning","handyman","lawn","moving","pedicure near me","pedicure service"];
for (const c of cases) { const m = matchServiceIntent(c); console.log(c.padEnd(28), m ? `${m.category.slug}/${m.service.slug}` : "— none —"); }
