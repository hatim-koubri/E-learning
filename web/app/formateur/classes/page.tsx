"use client";

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  ListVideo,
  Pencil,
  Plus,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {isSessionJoinable, SessionTiming, useSessionClock} from "@/components/SessionTiming";
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import {openMeeting, type MeetingAccess} from "@/lib/meeting";
import type {Classe, Session} from "@/lib/classes";
import type {FormationSummary} from "@/lib/formations";

type Eligible = {id: number; nom: string; email: string};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const sessionIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

export default function Page() {
  const [items, setItems] = useState<Classe[]>([]);
  const [formations, setFormations] = useState<FormationSummary[]>([]);
  const [eligible, setEligible] = useState<Record<number, Eligible[]>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [planningClassId, setPlanningClassId] = useState<number | null>(null);
  const [sessionsClassId, setSessionsClassId] = useState<number | null>(null);
  const [participantsClassId, setParticipantsClassId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [joinTarget, setJoinTarget] = useState<Session | null>(null);
  const [busy, setBusy] = useState("");
  const now = useSessionClock();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classesResult, formationsResult] = await Promise.all([
        api<Classe[]>("/formateur/classes"),
        api<FormationSummary[]>("/formateur/formations"),
      ]);
      setItems(classesResult);
      setFormations(formationsResult);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api<Classe[]>("/formateur/classes"),
      api<FormationSummary[]>("/formateur/formations"),
    ])
      .then(([classesResult, formationsResult]) => {
        setItems(classesResult);
        setFormations(formationsResult);
      })
      .catch((reason) => setError((reason as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function submitClass(event: FormEvent<HTMLFormElement>, id?: number) {
    event.preventDefault();
    setBusy(id ? `class-${id}` : "new-class");
    const data = new FormData(event.currentTarget);
    const payload = {
      formationId: Number(data.get("formationId")),
      nom: data.get("nom"),
      description: data.get("description"),
      capacite: Number(data.get("capacite")),
      dateDebut: data.get("dateDebut"),
      dateFin: data.get("dateFin"),
    };
    const planNow=!id&&data.get("planifierSeances")==="on";
    const sessionPlan=planNow?sessionPayloads(data):{payloads:[],dates:[],error:""};
    if(sessionPlan.error){setError(sessionPlan.error);setBusy("");return;}
    if(planNow&&sessionPlan.dates.some(date=>date<String(payload.dateDebut)||date>String(payload.dateFin))){setError("Toutes les séances doivent être comprises dans la période de la classe.");setBusy("");return;}
    let classCreated=false,createdSessions=0;
    try {
      const saved=await api<Classe>(id ? `/formateur/classes/${id}` : "/formateur/classes", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      classCreated=!id;
      for(const session of sessionPlan.payloads){await api(`/formateur/classes/${saved.id}/seances`,{method:"POST",body:JSON.stringify(session)});createdSessions+=1}
      setNotice(id ? "Classe modifiée." : "Classe créée.");
      setCreating(false);
      if(id)setEditingClassId(null);
      if(createdSessions)setNotice(`Classe créée avec ${createdSessions} séance(s) planifiée(s).`);
      await load();
    } catch (reason) {
      setError(classCreated?`La classe a été créée avec ${createdSessions} séance(s), puis la planification s’est arrêtée : ${(reason as Error).message}`:(reason as Error).message);
      if(classCreated){setCreating(false);await load()}
    } finally {
      setBusy("");
    }
  }

  async function submitSession(event: FormEvent<HTMLFormElement>, classId: number, id?: number) {
    event.preventDefault();
    const form=event.currentTarget;
    setBusy(id ? `session-${id}` : `new-session-${classId}`);
    const data = new FormData(form);
    const titre=String(data.get("titre"));
    const date=String(data.get("date"));
    const heure=String(data.get("heure"));
    const duration=Number(data.get("duree"));
    const recurring=!id&&data.get("recurrence")==="on";
    const selectedDays=data.getAll("jours").map(Number);
    const dates=recurring?recurrenceDates(date,String(data.get("dateFinRecurrence")),selectedDays):[date];
    if(recurring&&!dates.length){setError("Aucune date ne correspond aux jours sélectionnés dans cette période.");setBusy("");return;}
    const payloads=dates.map(currentDate=>{
      const start=new Date(sessionIso(currentDate,heure));
      return {titre,dateDebut:start.toISOString(),dateFin:new Date(start.getTime()+duration*60_000).toISOString(),fuseauHoraire:timezone()};
    });
    let created=0;
    try {
      for(const payload of payloads){await api(id ? `/formateur/seances/${id}` : `/formateur/classes/${classId}/seances`, {method:id?"PUT":"POST",body:JSON.stringify(payload)});created+=1}
      form.reset();
      if(!id)setPlanningClassId(null);
      setNotice(id?"Séance modifiée.":payloads.length>1?`${payloads.length} séances planifiées.`:"Séance planifiée.");
      await load();
    } catch (reason) {
      setError(created?`${created} séance(s) créée(s), puis la planification s’est arrêtée : ${(reason as Error).message}`:(reason as Error).message);
      if(created)await load();
    } finally {
      setBusy("");
    }
  }

  async function candidates(id: number) {
    setBusy(`candidates-${id}`);
    try {
      const list = await api<Eligible[]>(`/formateur/classes/${id}/participants-eligibles`);
      setEligible((current) => ({...current, [id]: list}));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function assign(classId: number, participantId: number) {
    setBusy(`assign-${participantId}`);
    try {
      await api(`/formateur/classes/${classId}/membres`, {
        method: "POST",
        body: JSON.stringify({participantId}),
      });
      setNotice("Participant affecté.");
      await load();
      await candidates(classId);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    if (!cancelTarget) return;
    setBusy(`cancel-${cancelTarget.id}`);
    try {
      await api(`/formateur/seances/${cancelTarget.id}/annulation`, {method: "POST"});
      setCancelTarget(null);
      setNotice("La séance a été annulée.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function join(id: number) {
    setBusy(`join-${id}`);
    try {
      const response = await api<MeetingAccess>(`/formateur/seances/${id}/join`);
      setJoinTarget(null);
      openMeeting(response, "/formateur/classes");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  const stats = useMemo(() => {
    const sessions = items.flatMap((item) => item.seances);
    return {
      sessions: sessions.length,
      members: items.reduce((sum, item) => sum + item.membres.length, 0),
      upcoming: sessions.filter((session) => session.statut === "PLANIFIEE").length,
    };
  }, [items]);
  const classFormations=formations.filter((formation)=>formation.statut==="PUBLIEE"&&(formation.classesGratuites||Number(formation.supplementClasses)>0));
  const editingClass=items.find((item)=>item.id===editingClassId)??null;
  const planningClass=items.find((item)=>item.id===planningClassId)??null;
  const sessionsClass=items.find((item)=>item.id===sessionsClassId)??null;
  const participantsClass=items.find((item)=>item.id===participantsClassId)??null;

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader
          eyebrow="Classes virtuelles"
          title="Classes et séances"
          description="Créez vos groupes, affectez les participants éligibles et planifiez leurs rendez-vous Jitsi."
          actions={<Button disabled={classFormations.length===0} title={classFormations.length===0?"Publiez d’abord une formation avec une offre de classes":undefined} onClick={() => setCreating(true)}><Plus size={18} /> Nouvelle classe</Button>}
        />
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <div className="class-overview-bar" aria-label="Résumé des classes">
          <span><strong>{items.length}</strong> classe{items.length>1?"s":""}</span>
          <i aria-hidden="true" />
          <span><strong>{stats.members}</strong> participant{stats.members>1?"s":""}</span>
          <i aria-hidden="true" />
          <span><strong>{stats.upcoming}</strong> séance{stats.upcoming>1?"s":""} à venir</span>
        </div>

        {loading ? (
          <Card><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></Card>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune classe créée"
            description="Publiez une formation avec une offre de classes, puis créez son premier groupe."
            action={<Button disabled={classFormations.length===0} onClick={() => setCreating(true)}><Plus size={17} /> Créer une classe</Button>}
          />
        ) : (
          <div className="class-grid class-management-grid">
            {items.map((classe) => {
              const nextSession=classe.seances
                .filter((session)=>session.statut==="PLANIFIEE"&&new Date(session.dateFin).getTime()>=(now??0))
                .sort((a,b)=>new Date(a.dateDebut).getTime()-new Date(b.dateDebut).getTime())[0];
              const occupancy=Math.min(100,Math.round((classe.membres.length/classe.capacite)*100));
              return <Card className="class-card class-management-card" key={classe.id}>
                <header className="class-card-header">
                  <div>
                    <div className="class-card-kicker"><Badge variant="primary">{classe.statut}</Badge><span>{classe.formation}</span></div>
                    <h2 className="class-title">{classe.nom}</h2>
                    {classe.description&&<p className="class-description">{classe.description}</p>}
                  </div>
                  <button className="class-edit-button" type="button" onClick={()=>setEditingClassId(classe.id)} aria-label={`Modifier ${classe.nom}`}><Pencil size={17}/></button>
                </header>
                <div className="class-period"><CalendarDays size={17}/><span><small>Période de la classe</small><strong>{new Date(classe.dateDebut).toLocaleDateString("fr-FR")} — {new Date(classe.dateFin).toLocaleDateString("fr-FR")}</strong></span></div>
                <div className="class-capacity">
                  <div><span>Participants</span><strong>{classe.membres.length} / {classe.capacite}</strong></div>
                  <div className="class-capacity-track"><i style={{width:`${occupancy}%`}}/></div>
                </div>
                <div className="class-next-session">
                  <span className="class-next-icon"><Video size={18}/></span>
                  <div><small>Prochaine séance</small>{nextSession?<><strong>{nextSession.titre}</strong><span>{new Date(nextSession.dateDebut).toLocaleString("fr-FR")} · {formatDuration(nextSession)}</span></>:<strong>Aucune séance planifiée</strong>}</div>
                </div>
                <div className="class-primary-actions">
                  <Button onClick={()=>setPlanningClassId(classe.id)}><Plus size={17}/> Nouvelle séance</Button>
                  <Button variant="secondary" onClick={()=>setSessionsClassId(classe.id)}><ListVideo size={17}/> Voir les séances <span className="action-count">{classe.seances.length}</span></Button>
                </div>
                <Button className="class-participants-button" variant="ghost" onClick={()=>setParticipantsClassId(classe.id)}><UsersRound size={17}/> Voir ou ajouter des participants</Button>
              </Card>;
            })}
          </div>
        )}

        <Modal open={creating} title="Nouvelle classe" description="Associez le groupe à une formation publiée." onClose={() => setCreating(false)}>
          <form className="stack" onSubmit={(event) => submitClass(event)}>
            <ClassFields formations={classFormations} />
            <CreateClassSessions />
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Fermer</Button>
              <Button type="submit" loading={busy === "new-class"}>Créer la classe</Button>
            </div>
          </form>
        </Modal>
        <Modal open={Boolean(editingClass)} title="Modifier la classe" description={editingClass?.nom} onClose={()=>setEditingClassId(null)}>
          {editingClass&&<form className="stack" onSubmit={(event)=>submitClass(event,editingClass.id)}>
            <ClassFields formations={formations} value={editingClass}/>
            <div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setEditingClassId(null)}>Fermer</Button><Button type="submit" loading={busy===`class-${editingClass.id}`}>Enregistrer</Button></div>
          </form>}
        </Modal>
        <Modal open={Boolean(planningClass)} title="Planifier une nouvelle séance" description={planningClass?`${planningClass.nom} · du ${new Date(planningClass.dateDebut).toLocaleDateString("fr-FR")} au ${new Date(planningClass.dateFin).toLocaleDateString("fr-FR")}`:""} onClose={()=>setPlanningClassId(null)} panelClassName="class-action-modal">
          {planningClass&&<form className="stack" onSubmit={(event)=>submitSession(event,planningClass.id)}>
            <SessionFields classStart={planningClass.dateDebut} classEnd={planningClass.dateFin}/>
            <div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setPlanningClassId(null)}>Annuler</Button><Button type="submit" loading={busy===`new-session-${planningClass.id}`}><CalendarDays size={17}/> Planifier la séance</Button></div>
          </form>}
        </Modal>
        <Modal open={Boolean(sessionsClass)} title="Séances de la classe" description={sessionsClass?.nom} onClose={()=>setSessionsClassId(null)} panelClassName="class-action-modal">
          {sessionsClass&&<div className="class-modal-content">
            <div className="class-modal-toolbar"><span><strong>{sessionsClass.seances.length}</strong> séance{sessionsClass.seances.length>1?"s":""}</span><Button size="sm" onClick={()=>{setSessionsClassId(null);setPlanningClassId(sessionsClass.id)}}><Plus size={16}/> Nouvelle séance</Button></div>
            {sessionsClass.seances.length?<div className="session-list class-session-list">{sessionsClass.seances.map((session)=><article className="session-row" key={session.id}>
              <div><SessionTiming session={session} now={now}/><h3 className="session-title">{session.titre}</h3><span className="session-date"><Clock3 size={15}/> {new Date(session.dateDebut).toLocaleString("fr-FR")} · {formatDuration(session)}</span>
                {session.statut==="PLANIFIEE"&&<details className="session-edit"><summary>Modifier la séance</summary><form className="stack section-space" onSubmit={(event)=>submitSession(event,sessionsClass.id,session.id)}><SessionFields value={session} classStart={sessionsClass.dateDebut} classEnd={sessionsClass.dateFin}/><Button type="submit" loading={busy===`session-${session.id}`}>Enregistrer</Button></form></details>}
              </div>
              {session.statut==="PLANIFIEE"&&<div className="row compact"><Button size="sm" disabled={!isSessionJoinable(session,now)} onClick={()=>setJoinTarget(session)}><ExternalLink size={15}/> {isSessionJoinable(session,now)?"Préparer":"Accès bientôt"}</Button><Button variant="danger" size="sm" onClick={()=>setCancelTarget(session)}>Annuler</Button></div>}
            </article>)}</div>:<div className="class-modal-empty"><Video size={28}/><h3>Aucune séance planifiée</h3><p>Créez le premier rendez-vous de cette classe.</p><Button onClick={()=>{setSessionsClassId(null);setPlanningClassId(sessionsClass.id)}}><Plus size={17}/> Planifier une séance</Button></div>}
          </div>}
        </Modal>
        <Modal open={Boolean(participantsClass)} title="Participants de la classe" description={participantsClass?.nom} onClose={()=>setParticipantsClassId(null)} panelClassName="class-action-modal">
          {participantsClass&&<div className="class-modal-content">
            <div className="class-modal-toolbar"><span><strong>{participantsClass.membres.length}</strong> participant{participantsClass.membres.length>1?"s":""} · {participantsClass.capacite-participantsClass.membres.length} place{participantsClass.capacite-participantsClass.membres.length>1?"s":""} disponible{participantsClass.capacite-participantsClass.membres.length>1?"s":""}</span><Button size="sm" loading={busy===`candidates-${participantsClass.id}`} onClick={()=>candidates(participantsClass.id)}><UserPlus size={16}/> Ajouter</Button></div>
            {participantsClass.membres.length?<div className="participant-management-list">{participantsClass.membres.map((member)=><div className="participant-management-row" key={member.id}><span className="participant-avatar">{member.nom.slice(0,1).toLocaleUpperCase("fr")}</span><div><strong>{member.nom}</strong><p>{member.email}</p></div><Badge variant="success">{member.statut}</Badge></div>)}</div>:<div className="class-modal-empty compact"><UsersRound size={26}/><h3>Aucun participant affecté</h3><p>Ajoutez les participants éligibles à cette classe.</p></div>}
            {eligible[participantsClass.id]&&<section className="eligible-participants"><div><span className="eyebrow">Participants éligibles</span><h3>Ajouter à la classe</h3></div>{eligible[participantsClass.id].length?eligible[participantsClass.id].map((participant)=><div className="participant-management-row" key={participant.id}><span className="participant-avatar soft">{participant.nom.slice(0,1).toLocaleUpperCase("fr")}</span><div><strong>{participant.nom}</strong><p>{participant.email}</p></div><Button size="sm" loading={busy===`assign-${participant.id}`} onClick={()=>assign(participantsClass.id,participant.id)}>Affecter</Button></div>):<p className="muted">Tous les participants éligibles sont déjà affectés.</p>}</section>}
          </div>}
        </Modal>
        <Modal
          open={Boolean(joinTarget)}
          title="Salle d’attente Khotwa"
          description="Contrôlez la séance avant d’ouvrir votre salle Jitsi formateur."
          onClose={() => setJoinTarget(null)}
        >
          {joinTarget && (
            <div className="waiting-room stack">
              <div className="waiting-room-session">
                <span className="resource-kicker"><Video aria-hidden="true" size={17} /> Séance en direct</span>
                <h3>{joinTarget.titre}</h3>
                <p><Clock3 aria-hidden="true" size={16} /> {new Date(joinTarget.dateDebut).toLocaleString("fr-FR")}</p>
              </div>
              <p className="muted">Vous ouvrirez la salle en premier comme hôte. Votre nom de compte Khotwa sera utilisé automatiquement et les participants pourront ensuite vous rejoindre.</p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setJoinTarget(null)} disabled={busy === `join-${joinTarget.id}`}>Retour</Button>
                <Button loading={busy === `join-${joinTarget.id}`} onClick={() => join(joinTarget.id)}>
                  <ExternalLink size={17} /> Ouvrir Jitsi
                </Button>
              </div>
            </div>
          )}
        </Modal>
        <ConfirmDialog
          open={Boolean(cancelTarget)}
          title="Annuler cette séance ?"
          description={`La séance « ${cancelTarget?.titre ?? ""} » ne sera plus accessible aux participants.`}
          confirmLabel="Annuler la séance"
          danger
          busy={busy.startsWith("cancel-")}
          onCancel={() => setCancelTarget(null)}
          onConfirm={cancel}
        />
      </AppShell>
    </Protected>
  );
}

function ClassFields({formations, value}: {formations: FormationSummary[]; value?: Classe}) {
  return (
    <div className="form-grid">
      <label>
        Formation
        <select name="formationId" required defaultValue={value?.formationId}>
          <option value="">Sélectionner une formation</option>
          {formations.filter((formation)=>value?.formationId===formation.id||(formation.statut==="PUBLIEE"&&(formation.classesGratuites||Number(formation.supplementClasses)>0))).map((formation) => (
            <option key={formation.id} value={formation.id}>{formation.titre}</option>
          ))}
        </select>
      </label>
      <label>Nom<input name="nom" required maxLength={180} defaultValue={value?.nom} /></label>
      <label>Description<textarea name="description" maxLength={10000} defaultValue={value?.description} /></label>
      <label>Capacité<input name="capacite" type="number" min={Math.max(1,value?.membres.length??1)} required defaultValue={value?.capacite ?? 20} /><small>Minimum actuel : {Math.max(1,value?.membres.length??1)}</small></label>
      <label>Début<input name="dateDebut" type="date" required defaultValue={value?.dateDebut} /></label>
      <label>Fin<input name="dateFin" type="date" required defaultValue={value?.dateFin} /></label>
    </div>
  );
}

function CreateClassSessions(){
  const [enabled,setEnabled]=useState(false);
  return <section className="create-class-sessions">
    <label className="checkbox-row"><input name="planifierSeances" type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/> Planifier les séances maintenant</label>
    {enabled&&<><div><span className="resource-kicker">Programme de la classe</span><h3>Séances initiales</h3><p>Choisissez une séance unique ou une série récurrente. Vous pourrez modifier chaque séance après la création.</p></div><SessionFields classStart="" classEnd=""/></>}
  </section>
}

function SessionFields({value,classStart,classEnd}: {value?:Session;classStart:string;classEnd:string}) {
  const [recurring,setRecurring]=useState(false);
  const start=value?new Date(value.dateDebut):null;
  const duration=value?Math.round((new Date(value.dateFin).getTime()-new Date(value.dateDebut).getTime())/60_000):60;
  const localDate=start?localPart(start,"date"):undefined;
  const localTime=start?localPart(start,"time"):undefined;
  return (
    <div className="session-planner">
      <div className="form-grid">
        <label>Titre<input name="titre" required maxLength={180} defaultValue={value?.titre} /></label>
        <label>Date de début<input name="date" type="date" min={classStart||undefined} max={classEnd||undefined} required defaultValue={localDate}/></label>
        <label>Heure de début<input name="heure" type="time" required defaultValue={localTime}/></label>
        <label>Durée<select name="duree" required defaultValue={[60,90,120].includes(duration)?duration:60}><option value="60">1 heure</option><option value="90">1 heure 30</option><option value="120">2 heures</option></select></label>
      </div>
      {!value&&<div className="recurrence-panel">
        <label className="checkbox-row"><input name="recurrence" type="checkbox" checked={recurring} onChange={event=>setRecurring(event.target.checked)}/> Planifier plusieurs séances</label>
        {recurring&&<><p className="field-hint">La même séance sera créée à la même heure pendant la période choisie.</p><fieldset><legend>Jours de la semaine</legend><div className="weekday-grid">{[[1,"Lun"],[2,"Mar"],[3,"Mer"],[4,"Jeu"],[5,"Ven"],[6,"Sam"],[0,"Dim"]].map(([day,label])=><label key={day}><input type="checkbox" name="jours" value={day}/><span>{label}</span></label>)}</div></fieldset><label>Jusqu’au<input name="dateFinRecurrence" type="date" min={classStart||undefined} max={classEnd||undefined} required={recurring}/></label></>}
      </div>}
    </div>
  );
}

function localPart(date:Date,part:"date"|"time"){
  const offset=date.getTimezoneOffset()*60_000;
  const local=new Date(date.getTime()-offset).toISOString();
  return part==="date"?local.slice(0,10):local.slice(11,16);
}

function recurrenceDates(start:string,end:string,days:number[]){
  if(!start||!end||!days.length||end<start)return [];
  const dates:string[]=[];
  const cursor=new Date(`${start}T12:00:00Z`),last=new Date(`${end}T12:00:00Z`);
  while(cursor<=last){if(days.includes(cursor.getUTCDay()))dates.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+1)}
  return dates;
}

function sessionPayloads(data:FormData){
  const titre=String(data.get("titre")),date=String(data.get("date")),heure=String(data.get("heure")),duration=Number(data.get("duree"));
  const recurring=data.get("recurrence")==="on",selectedDays=data.getAll("jours").map(Number);
  const dates=recurring?recurrenceDates(date,String(data.get("dateFinRecurrence")),selectedDays):[date];
  if(recurring&&!dates.length)return {payloads:[],dates,error:"Aucune date ne correspond aux jours sélectionnés dans cette période."};
  const payloads=dates.map(currentDate=>{const start=new Date(sessionIso(currentDate,heure));return {titre,dateDebut:start.toISOString(),dateFin:new Date(start.getTime()+duration*60_000).toISOString(),fuseauHoraire:timezone()}});
  return {payloads,dates,error:""};
}

function formatDuration(session:Session){
  const minutes=Math.round((new Date(session.dateFin).getTime()-new Date(session.dateDebut).getTime())/60_000);
  return minutes===90?"1 h 30":minutes%60===0?`${minutes/60} h`:`${minutes} min`;
}
