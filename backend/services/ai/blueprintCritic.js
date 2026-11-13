function norm(value=''){return String(value||'').trim().toLowerCase();}
function critiqueBlueprint(blueprint={}) {
  const errors=[]; const warnings=[];
  const roles=Array.isArray(blueprint.roles)?blueprint.roles:[];
  const screens=Array.isArray(blueprint.screens)?blueprint.screens:[];
  const ids=new Set(); const purposes=new Map();
  for(const s of screens){
    if(!s.id) errors.push('Screen without id');
    else if(ids.has(s.id)) errors.push(`Duplicate screen id: ${s.id}`);
    else ids.add(s.id);
    const purpose=norm(s.purpose);
    if(purpose){if(purposes.has(purpose)) warnings.push(`Duplicate screen purpose: ${s.id} and ${purposes.get(purpose)}.`); else purposes.set(purpose,s.id);}
  }
  const domain=blueprint.appIdentity?.domain;
  const names=roles.map(r=>norm(r.label||r.name));
  if(domain==='hospital' && !roles.some(r=>r.explicit) && (names.includes('manager')||names.includes('staff'))) errors.push('Hospital fell back to generic Manager/Staff roles.');
  if(domain==='school' && !roles.some(r=>r.explicit) && (names.includes('manager')||names.includes('staff'))) errors.push('School fell back to generic Manager/Staff roles.');
  if(blueprint.featurePolicies?.roleBased && roles.length<2) errors.push('Role-based app must define at least two roles.');
  if(blueprint.featurePolicies?.analytics==='disabled' && screens.some(s=>/analytics|report|chart/i.test(`${s.id} ${s.label||''} ${s.kind||''}`))) errors.push('Analytics/report screen present while analytics policy is disabled.');
  const byRole=blueprint.navigation?.byRole||{};
  for(const role of roles){
    const nav=byRole[role.id]||[];
    if(!nav.length) errors.push(`Role ${role.label||role.id} has no navigation.`);
    for(const id of nav) if(!ids.has(id)) errors.push(`Navigation target ${id} for ${role.id} has no screen.`);
  }
  const dashboards=blueprint.roleDashboards||{};
  const signatures=roles.map(r=>JSON.stringify(dashboards[r.id]?.cards||[]));
  if(signatures.length>1 && new Set(signatures).size===1) errors.push('Role dashboards are identical.');
  for(const role of roles){
    const dashboard=dashboards[role.id];
    if(!dashboard || !Array.isArray(dashboard.cards) || !dashboard.cards.length) errors.push(`Role ${role.label||role.id} has no meaningful dashboard cards.`);
  }
  const actions=blueprint.primaryActions?.byRole||{};
  for(const role of roles) if(!Array.isArray(actions[role.id])) errors.push(`Role ${role.label||role.id} has no primary action policy.`);
  return {pass:errors.length===0,errors,warnings};
}
module.exports={critiqueBlueprint};
