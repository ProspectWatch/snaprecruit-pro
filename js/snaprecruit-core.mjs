// SnapRecruit core logic — extracted verbatim from scanner-v14.html.
// LOCKED BEHAVIOR: cleaning rules, username generation order, and dedup
// must match the production scanner exactly. See tests/core.test.mjs for
// the parity check against the original implementation.

export function cleanHandle(s){return String(s||'').trim().replace(/^@/,'').replace(/[^A-Za-z0-9._-]/g,'').slice(0,30)}

export function cleanName(s){return String(s||'').trim().replace(/\b(she\/her|he\/him|they\/them)\b/ig,'').replace(/\s+/g,' ').replace(/^[\s._-]+|[\s._-]+$/g,'').slice(0,60)}

export function validHandle(s){return !!(s&&s.length>2&&/[A-Za-z]/.test(s)&&/^[A-Za-z0-9._-]+$/.test(s))}

// Same handles, same order, same dedup as v14 suggestions(), with a type tag
// per row so the UI can label DETECTED SNAPCHAT / INSTAGRAM HANDLE rows.
// Priority: detected Snapchat, then first.last/first_last/first-last/firstlast,
// then Instagram fallback. First occurrence wins on duplicates.
export function buildSuggestions({name,instagram,snapchat}){
  const cname=cleanName(name),ig=cleanHandle(instagram),snap=cleanHandle(snapchat);
  const parts=cname.toLowerCase().split(/\s+/).filter(Boolean);
  const out=[];
  const push=(handle,type)=>{if(!validHandle(handle))return;if(out.some(o=>o.handle===handle))return;out.push({handle,type})};
  if(snap)push(snap,'snapchat');
  if(parts.length>=2){
    const f=parts[0],l=parts.at(-1);
    push(`${f}.${l}`,'variant');push(`${f}_${l}`,'variant');push(`${f}-${l}`,'variant');push(`${f}${l}`,'variant');
  }
  if(ig)push(ig,'instagram');
  return out;
}
