'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

const FILE_COLORS = {
  pdf:{bg:'#1e3a5f',tc:'#60a5fa'},xlsx:{bg:'#1a2e1a',tc:'#4ade80'},xls:{bg:'#1a2e1a',tc:'#4ade80'},
  docx:{bg:'#1a2e3a',tc:'#38bdf8'},doc:{bg:'#1a2e3a',tc:'#38bdf8'},zip:{bg:'#2e1e0a',tc:'#fb923c'},
  rar:{bg:'#2e1e0a',tc:'#fb923c'},pptx:{bg:'#2a1428',tc:'#f472b6'},ppt:{bg:'#2a1428',tc:'#f472b6'},
  sql:{bg:'#2a1e42',tc:'#a78bfa'},env:{bg:'#2a1e42',tc:'#a78bfa'},yml:{bg:'#1a2e3a',tc:'#38bdf8'},
  yaml:{bg:'#1a2e3a',tc:'#38bdf8'},js:{bg:'#2e2008',tc:'#f4a829'},ts:{bg:'#1e2e42',tc:'#60a5fa'},
  png:{bg:'#1a2a1a',tc:'#4ade80'},jpg:{bg:'#1a2a1a',tc:'#4ade80'},jpeg:{bg:'#1a2a1a',tc:'#4ade80'},
  gif:{bg:'#1a2a1a',tc:'#4ade80'},webp:{bg:'#1a2a1a',tc:'#4ade80'},txt:{bg:'#252c3e',tc:'#8b93aa'},
  mp4:{bg:'#1a1a2e',tc:'#818cf8'},default:{bg:'#252c3e',tc:'#8b93aa'},
}
const PREVIEWABLE = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','application/pdf','text/plain','text/csv','application/json']
const getColor = n => FILE_COLORS[n?.split('.').pop()?.toLowerCase()] || FILE_COLORS.default
const getExt = n => (n?.split('.').pop()?.toUpperCase() || 'FILE').slice(0,4)
const fmtBytes = b => { if(!b)return'0 B'; if(b<1024)return b+' B'; if(b<1048576)return(b/1024).toFixed(1)+' KB'; if(b<1073741824)return(b/1048576).toFixed(1)+' MB'; return(b/1073741824).toFixed(2)+' GB' }
const timeAgo = d => { const diff=Date.now()-new Date(d).getTime(),m=Math.floor(diff/60000); if(m<1)return'Just now'; if(m<60)return m+'m ago'; const h=Math.floor(m/60); if(h<24)return h+'h ago'; return Math.floor(h/24)+'d ago' }

export default function FilesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileRef = useRef()
  const [files, setFiles] = useState([])
  const [depts, setDepts] = useState([])
  const [dept, setDept] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date')
  const [view, setView] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState({text:'',type:''})
  const [selected, setSelected] = useState(new Set())
  const [ctxMenu, setCtxMenu] = useState(null)
  const [shareModal, setShareModal] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [sharePermission, setSharePermission] = useState('view')
  const [sharePassword, setSharePassword] = useState('')
  const [shareExpiry, setShareExpiry] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [renameModal, setRenameModal] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [folderModal, setFolderModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [currentFolder, setCurrentFolder] = useState(null)
  const [folderStack, setFolderStack] = useState([])
  const [previewModal, setPreviewModal] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(()=>{ if(status==='unauthenticated') router.push('/login') },[status])
  useEffect(()=>{ if(status==='authenticated'){ fetchDepts(); fetchFiles() } },[status,dept,search,sort,currentFolder])

  async function fetchDepts() {
    const r=await fetch('/api/departments'); const d=await r.json()
    if(d.departments) setDepts(d.departments)
  }
  async function fetchFiles() {
    setLoading(true)
    const p=new URLSearchParams()
    if(dept) p.set('department',dept)
    if(search) p.set('search',search)
    if(sort) p.set('sort',sort)
    if(currentFolder) p.set('folder',currentFolder._id)
    const r=await fetch('/api/files/list?'+p); const d=await r.json()
    setFiles(d.files||[]); setLoading(false)
  }
  function showMsg(text,type='success'){setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000)}

  async function handleUpload(e) {
    const file=e.target.files?.[0]; if(!file) return
    setUploading(true); showMsg('Encrypting & uploading…','info')
    const fd=new FormData(); fd.append('file',file)
    if(dept) fd.append('departmentId',dept)
    try {
      const r=await fetch('/api/files/upload',{method:'POST',body:fd})
      const d=await r.json()
      if(d.success){ showMsg('✓ Uploaded & encrypted!'); fetchFiles() }
      else if(d.quotaExceeded){ showMsg('✗ Quota exceeded! Contact your admin.','error') }
      else showMsg('✗ '+d.error,'error')
    } catch(err){ showMsg('✗ '+err.message,'error') }
    finally{ setUploading(false); fileRef.current.value='' }
  }

  async function handleDownload(file) {
    try {
      const r=await fetch('/api/files/download?id='+file._id)
      if(!r.ok){ const d=await r.json(); throw new Error(d.error) }
      const blob=await r.blob(); const url=URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download=file.originalName||file.name; a.click()
      URL.revokeObjectURL(url)
    } catch(err){ showMsg('✗ '+err.message,'error') }
  }

  async function handleDelete(file) {
    if(!confirm(`Delete "${file.name}"?`)) return
    const r=await fetch('/api/files/delete?id='+file._id,{method:'DELETE'})
    const d=await r.json()
    if(d.success){ showMsg('✓ Moved to recycle bin'); fetchFiles() }
    else showMsg('✗ '+d.error,'error')
  }

  async function handleBulkDelete() {
    if(!selected.size) return
    if(!confirm(`Delete ${selected.size} files?`)) return
    let count=0
    for(const id of selected){ const r=await fetch('/api/files/delete?id='+id,{method:'DELETE'}); const d=await r.json(); if(d.success) count++ }
    showMsg(`✓ ${count} files moved to recycle bin`); setSelected(new Set()); fetchFiles()
  }

  async function handleShare(file) {
    setShareModal(file); setShareUrl(''); setShareToken(''); setSharePermission('view'); setSharePassword(''); setShareExpiry('')
  }

  async function generateShareLink() {
    const body={fileId:shareModal._id,permission:sharePermission}
    if(sharePassword) body.password=sharePassword
    if(shareExpiry) body.expiresAt=shareExpiry
    const r=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const d=await r.json()
    if(d.shareUrl){ setShareUrl(d.shareUrl); setShareToken(d.token) }
    else showMsg('✗ '+d.error,'error')
  }

  async function revokeShareLink() {
    if(!shareToken) return
    await fetch('/api/share/revoke',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:shareToken})})
    showMsg('✓ Link revoked'); setShareUrl(''); setShareToken('')
  }

  async function handlePreview(file) {
    if(!PREVIEWABLE.includes(file.mimeType)){ showMsg('Preview not available for this file type','info'); return }
    setPreviewModal(file); setPreviewLoading(true); setPreviewUrl('')
    try {
      const r=await fetch('/api/files/preview?id='+file._id)
      if(!r.ok){ const d=await r.json(); throw new Error(d.error) }
      const blob=await r.blob(); const url=URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch(err){ showMsg('✗ Preview failed: '+err.message,'error'); setPreviewModal(null) }
    finally{ setPreviewLoading(false) }
  }

  async function handleRename() {
    if(!renameVal.trim()) return
    const r=await fetch('/api/files/rename',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:renameModal._id,name:renameVal.trim()})})
    const d=await r.json()
    if(d.success){ showMsg('✓ Renamed'); setRenameModal(null); fetchFiles() }
    else showMsg('✗ '+d.error,'error')
  }

  async function handleNewFolder() {
    if(!folderName.trim()) return
    const r=await fetch('/api/files/folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:folderName.trim(),department:dept||null,parentFolder:currentFolder?._id||null})})
    const d=await r.json()
    if(d.success){ showMsg('✓ Folder created'); setFolderModal(false); setFolderName(''); fetchFiles() }
    else showMsg('✗ '+d.error,'error')
  }

  function openFolder(folder){ setFolderStack(p=>[...p,{name:folder.name,_id:folder._id}]); setCurrentFolder(folder); setSelected(new Set()) }
  function goBack(){ const s=[...folderStack]; s.pop(); setFolderStack(s); setCurrentFolder(s.length>0?s[s.length-1]:null); setSelected(new Set()) }
  function toggleSelect(id){ const s=new Set(selected); s.has(id)?s.delete(id):s.add(id); setSelected(s) }

  if(status==='loading') return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e8ecf4'}}>Loading…</div>

  const msgColors={success:'#22c97e',error:'#f05b5b',info:'#f4a829'}
  const folders=files.filter(f=>f.isFolder), fileItems=files.filter(f=>!f.isFolder)
  const inputStyle={width:'100%',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'#e8ecf4',outline:'none',fontFamily:'inherit',transition:'.15s'}
  const permColors={view:'#60a5fa',download:'#4ade80',edit:'#f4a829'}

  return (
    <div className="shell">
      <Sidebar/>
      <div className="main-content">
        <TopBar title="File Browser" onSearch={v=>setSearch(v)}>
          <button className="btn-amber" onClick={()=>fileRef.current?.click()} disabled={uploading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
            {uploading?'Uploading…':'Upload'}
          </button>
        </TopBar>
        <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleUpload}/>

        <div className="toolbar">
          {currentFolder && <button onClick={goBack} style={{padding:'4px 10px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'6px',fontSize:'11px',color:'#8b93aa',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'5px'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back</button>}
          <button onClick={()=>setFolderModal(true)} style={{padding:'5px 10px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'6px',fontSize:'11px',color:'#8b93aa',cursor:'pointer',fontFamily:'inherit'}}>+ New Folder</button>
          <select value={dept} onChange={e=>setDept(e.target.value)} style={{background:'#1e2435',border:'1px solid #2e3650',borderRadius:'6px',color:'#8b93aa',fontSize:'11px',padding:'5px 8px',outline:'none',fontFamily:'inherit'}}>
            <option value="">All departments</option>
            {depts.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:'#1e2435',border:'1px solid #2e3650',borderRadius:'6px',color:'#8b93aa',fontSize:'11px',padding:'5px 8px',outline:'none',fontFamily:'inherit'}}>
            <option value="date">Date</option><option value="name">Name</option><option value="size">Size</option><option value="type">Type</option>
          </select>
          {selected.size>0 && <button onClick={handleBulkDelete} style={{padding:'5px 10px',background:'#2a0e0e',border:'1px solid #7a1f1f',borderRadius:'6px',fontSize:'11px',color:'#f87171',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Delete {selected.size} selected</button>}
          <div style={{flex:1}}/>
          {msg.text && <span style={{fontSize:'11px',color:msgColors[msg.type]||'#e8ecf4'}}>{msg.text}</span>}
          <div style={{display:'flex',border:'1px solid #2e3650',borderRadius:'6px',overflow:'hidden'}}>
            {['grid','list'].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:'4px 10px',background:v===view?'#252c3e':'#1e2435',border:'none',color:v===view?'#f4a829':'#555e78',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>{v==='grid'?'⊞':'☰'}</button>)}
          </div>
        </div>

        {(folderStack.length>0||dept) && (
          <div style={{padding:'8px 20px',background:'#181c27',borderBottom:'1px solid #2e3650',display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',flexShrink:0}}>
            <span onClick={()=>{setCurrentFolder(null);setFolderStack([]);setDept('')}} style={{cursor:'pointer',color:'#f4a829'}}>CryptNest</span>
            {dept&&<><span style={{color:'#2e3650'}}>›</span><span style={{color:'#8b93aa'}}>{depts.find(d=>d._id===dept)?.name}</span></>}
            {folderStack.map((f,i)=><span key={f._id} style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{color:'#2e3650'}}>›</span><span style={{color:i===folderStack.length-1?'#e8ecf4':'#8b93aa'}}>{f.name}</span></span>)}
          </div>
        )}

        <div className="page-content" onClick={()=>setCtxMenu(null)}>
          {loading?<div style={{textAlign:'center',padding:'60px',color:'#555e78'}}>Loading…</div>
          :files.length===0?<div style={{textAlign:'center',padding:'80px 20px'}}><div style={{fontSize:'40px',marginBottom:'12px'}}>🪺</div><div style={{fontSize:'16px',fontWeight:700,color:'#e8ecf4',marginBottom:'6px'}}>No files here</div><div style={{fontSize:'13px',color:'#555e78',marginBottom:'20px'}}>Upload your first file</div><button className="btn-amber" onClick={()=>fileRef.current?.click()}>Upload file</button></div>
          :view==='grid'?(<div>
            {folders.length>0&&<><div style={{fontSize:'10px',color:'#555e78',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'10px'}}>Folders</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px',marginBottom:'20px'}}>
              {folders.map(f=><div key={f._id} style={{background:'#181c27',border:'1px solid #2e3650',borderRadius:'9px',padding:'12px',cursor:'pointer',transition:'.15s'}} onClick={()=>openFolder(f)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtxMenu({x:e.clientX,y:e.clientY,file:f})}}>
                <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#1a2e42',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'8px'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
                <div style={{fontSize:'12px',fontWeight:600,color:'#e8ecf4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
                <div style={{fontSize:'10px',color:'#555e78',marginTop:'2px'}}>Folder</div>
              </div>)}
            </div></>}
            {fileItems.length>0&&<><div style={{fontSize:'10px',color:'#555e78',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'10px'}}>Files</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px'}}>
              {fileItems.map(f=>{const clr=getColor(f.name); return(
                <div key={f._id} style={{background:'#181c27',border:`1px solid ${selected.has(f._id)?'#f4a829':'#2e3650'}`,borderRadius:'9px',padding:'12px',cursor:'pointer',transition:'.15s',position:'relative'}} onClick={()=>toggleSelect(f._id)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtxMenu({x:e.clientX,y:e.clientY,file:f})}}>
                  {selected.has(f._id)&&<div style={{position:'absolute',top:'8px',right:'8px',width:'16px',height:'16px',borderRadius:'50%',background:'#f4a829',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                  <div style={{height:'68px',background:'#1e2435',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'10px',fontSize:'18px',fontWeight:800,color:clr.tc,letterSpacing:'-1px'}}>{getExt(f.name)}</div>
                  <div style={{fontSize:'11px',fontWeight:600,color:'#e8ecf4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'2px'}}>{f.name}</div>
                  <div style={{fontSize:'10px',color:'#555e78'}}>{fmtBytes(f.sizeBytes)} · {timeAgo(f.createdAt)}</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'3px',background:'#0e2a1a',color:'#22c97e',fontSize:'8px',padding:'1px 5px',borderRadius:'3px',marginTop:'5px'}}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Encrypted
                  </div>
                </div>
              )})}
            </div></>}
          </div>):(
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Name','Dept','Size','Modified','Actions'].map(h=><th key={h} style={{fontSize:'10px',color:'#555e78',letterSpacing:'.8px',textTransform:'uppercase',fontWeight:500,padding:'10px 12px',textAlign:'left',borderBottom:'1px solid #2e3650',background:'#181c27'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {files.map(f=>{const clr=getColor(f.name); return(
                    <tr key={f._id} onMouseEnter={e=>e.currentTarget.style.background='#1e2435'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'9px 12px',borderBottom:'1px solid #2e3650'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <input type="checkbox" checked={selected.has(f._id)} onChange={()=>toggleSelect(f._id)} style={{accentColor:'#f4a829',flexShrink:0}}/>
                          {f.isFolder?<div style={{width:'28px',height:'28px',borderRadius:'6px',background:'#1a2e42',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
                          :<div style={{width:'28px',height:'28px',borderRadius:'6px',background:clr.bg,color:clr.tc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',fontWeight:700,flexShrink:0}}>{getExt(f.name)}</div>}
                          <span style={{fontSize:'12px',fontWeight:600,color:'#e8ecf4',cursor:f.isFolder?'pointer':'default'}} onClick={()=>f.isFolder&&openFolder(f)}>{f.name}</span>
                        </div>
                      </td>
                      <td style={{padding:'9px 12px',borderBottom:'1px solid #2e3650',fontSize:'11px',color:'#8b93aa'}}>{f.department?.name||'—'}</td>
                      <td style={{padding:'9px 12px',borderBottom:'1px solid #2e3650',fontSize:'11px',color:'#8b93aa'}}>{f.isFolder?'—':fmtBytes(f.sizeBytes)}</td>
                      <td style={{padding:'9px 12px',borderBottom:'1px solid #2e3650',fontSize:'11px',color:'#555e78'}}>{timeAgo(f.createdAt)}</td>
                      <td style={{padding:'9px 12px',borderBottom:'1px solid #2e3650'}}>
                        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                          {!f.isFolder&&PREVIEWABLE.includes(f.mimeType)&&<button onClick={()=>handlePreview(f)} style={{padding:'3px 7px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'4px',fontSize:'10px',color:'#818cf8',cursor:'pointer',fontFamily:'inherit'}}>Preview</button>}
                          {!f.isFolder&&<button onClick={()=>handleDownload(f)} style={{padding:'3px 7px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'4px',fontSize:'10px',color:'#60a5fa',cursor:'pointer',fontFamily:'inherit'}}>Download</button>}
                          {!f.isFolder&&<button onClick={()=>handleShare(f)} style={{padding:'3px 7px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'4px',fontSize:'10px',color:'#a78bfa',cursor:'pointer',fontFamily:'inherit'}}>Share</button>}
                          <button onClick={()=>{setRenameModal(f);setRenameVal(f.name)}} style={{padding:'3px 7px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'4px',fontSize:'10px',color:'#f4a829',cursor:'pointer',fontFamily:'inherit'}}>Rename</button>
                          <button onClick={()=>handleDelete(f)} style={{padding:'3px 7px',background:'#1e2435',border:'1px solid #2e3650',borderRadius:'4px',fontSize:'10px',color:'#f87171',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {ctxMenu&&(
          <div style={{position:'fixed',top:ctxMenu.y,left:ctxMenu.x,background:'#1e2435',border:'1px solid #2e3650',borderRadius:'9px',padding:'5px',zIndex:1000,minWidth:'160px'}} onClick={e=>e.stopPropagation()}>
            {ctxMenu.file.isFolder?<div onClick={()=>{openFolder(ctxMenu.file);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#60a5fa'}} onMouseEnter={e=>e.currentTarget.style.background='#252c3e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Open folder</div>:
            <>{PREVIEWABLE.includes(ctxMenu.file.mimeType)&&<div onClick={()=>{handlePreview(ctxMenu.file);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#818cf8'}} onMouseEnter={e=>e.currentTarget.style.background='#252c3e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Preview</div>}
            <div onClick={()=>{handleDownload(ctxMenu.file);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#60a5fa'}} onMouseEnter={e=>e.currentTarget.style.background='#252c3e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Download</div>
            <div onClick={()=>{handleShare(ctxMenu.file);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#a78bfa'}} onMouseEnter={e=>e.currentTarget.style.background='#252c3e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Share</div></>}
            <div onClick={()=>{setRenameModal(ctxMenu.file);setRenameVal(ctxMenu.file.name);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#f4a829'}} onMouseEnter={e=>e.currentTarget.style.background='#252c3e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Rename</div>
            <div style={{height:'1px',background:'#2e3650',margin:'4px 0'}}/>
            <div onClick={()=>{handleDelete(ctxMenu.file);setCtxMenu(null)}} style={{padding:'8px 12px',borderRadius:'5px',cursor:'pointer',fontSize:'12px',color:'#f87171'}} onMouseEnter={e=>e.currentTarget.style.background='#2a0e0e'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Move to trash</div>
          </div>
        )}

        {/* Preview Modal */}
        {previewModal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:3000,padding:'20px'}} onClick={()=>{setPreviewModal(null);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl('')}}>
            <div style={{width:'100%',maxWidth:'900px',background:'#181c27',border:'1px solid #2e3650',borderRadius:'12px',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',borderBottom:'1px solid #2e3650'}}>
                <span style={{fontSize:'13px',fontWeight:700,color:'#e8ecf4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'600px'}}>{previewModal.name}</span>
                <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                  <button onClick={()=>handleDownload(previewModal)} className="btn-ghost" style={{fontSize:'11px',padding:'5px 10px'}}>Download</button>
                  <button onClick={()=>{setPreviewModal(null);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl('')}} style={{background:'none',border:'none',color:'#8b93aa',cursor:'pointer',fontSize:'20px',lineHeight:1}}>×</button>
                </div>
              </div>
              <div style={{minHeight:'400px',maxHeight:'70vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1117',overflow:'auto'}}>
                {previewLoading?<div style={{color:'#555e78',fontSize:'13px'}}>Decrypting preview…</div>
                :previewUrl?(
                  previewModal.mimeType?.startsWith('image/')?<img src={previewUrl} alt={previewModal.name} style={{maxWidth:'100%',maxHeight:'70vh',objectFit:'contain'}}/>
                  :previewModal.mimeType==='application/pdf'?<iframe src={previewUrl} style={{width:'100%',height:'70vh',border:'none'}} title={previewModal.name}/>
                  :<iframe src={previewUrl} style={{width:'100%',height:'70vh',border:'none',background:'#fff',color:'#000'}} title={previewModal.name}/>
                ):null}
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {renameModal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={()=>setRenameModal(null)}>
            <div style={{background:'#181c27',border:'1px solid #2e3650',borderRadius:'12px',padding:'24px',width:'360px'}} onClick={e=>e.stopPropagation()}>
              <h3 style={{fontSize:'15px',fontWeight:700,color:'#e8ecf4',marginBottom:'16px'}}>Rename</h3>
              <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleRename()} style={inputStyle} autoFocus onFocus={e=>e.target.style.borderColor='#f4a829'} onBlur={e=>e.target.style.borderColor='#2e3650'}/>
              <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                <button onClick={()=>setRenameModal(null)} className="btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancel</button>
                <button onClick={handleRename} className="btn-amber" style={{flex:1,justifyContent:'center'}}>Rename</button>
              </div>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {folderModal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={()=>setFolderModal(false)}>
            <div style={{background:'#181c27',border:'1px solid #2e3650',borderRadius:'12px',padding:'24px',width:'360px'}} onClick={e=>e.stopPropagation()}>
              <h3 style={{fontSize:'15px',fontWeight:700,color:'#e8ecf4',marginBottom:'16px'}}>New folder</h3>
              <input value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleNewFolder()} placeholder="Folder name" style={inputStyle} autoFocus onFocus={e=>e.target.style.borderColor='#f4a829'} onBlur={e=>e.target.style.borderColor='#2e3650'}/>
              <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                <button onClick={()=>setFolderModal(false)} className="btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancel</button>
                <button onClick={handleNewFolder} className="btn-amber" style={{flex:1,justifyContent:'center'}}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {shareModal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={()=>setShareModal(null)}>
            <div style={{background:'#181c27',border:'1px solid #2e3650',borderRadius:'12px',padding:'24px',width:'420px',maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'15px',fontWeight:700,color:'#e8ecf4'}}>Share file</span>
                <button onClick={()=>setShareModal(null)} style={{background:'none',border:'none',color:'#8b93aa',cursor:'pointer',fontSize:'20px',lineHeight:1}}>×</button>
              </div>
              <p style={{fontSize:'12px',color:'#8b93aa',marginBottom:'16px'}}>Sharing: <strong style={{color:'#e8ecf4'}}>{shareModal.name}</strong></p>

              {/* Permission */}
              <label style={{fontSize:'11px',color:'#8b93aa',display:'block',marginBottom:'6px',fontWeight:500}}>Permission level</label>
              <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
                {['view','download','edit'].map(p=>(
                  <button key={p} onClick={()=>setSharePermission(p)} style={{flex:1,padding:'7px',borderRadius:'6px',border:`1px solid ${sharePermission===p?permColors[p]:'#2e3650'}`,background:sharePermission===p?'#1e2435':'#1e2435',color:sharePermission===p?permColors[p]:'#555e78',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Password */}
              <label style={{fontSize:'11px',color:'#8b93aa',display:'block',marginBottom:'6px',fontWeight:500}}>Password protect (optional)</label>
              <input value={sharePassword} onChange={e=>setSharePassword(e.target.value)} placeholder="Leave empty for no password" type="password" style={{...inputStyle,marginBottom:'14px'}} onFocus={e=>e.target.style.borderColor='#f4a829'} onBlur={e=>e.target.style.borderColor='#2e3650'}/>

              {/* Expiry */}
              <label style={{fontSize:'11px',color:'#8b93aa',display:'block',marginBottom:'6px',fontWeight:500}}>Expiry date (optional)</label>
              <input type="date" value={shareExpiry} onChange={e=>setShareExpiry(e.target.value)} style={{...inputStyle,marginBottom:'16px',color:'#8b93aa'}} onFocus={e=>e.target.style.borderColor='#f4a829'} onBlur={e=>e.target.style.borderColor='#2e3650'}/>

              {/* Generate link */}
              {!shareUrl?(
                <button onClick={generateShareLink} className="btn-amber" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}>Generate secure link</button>
              ):(
                <>
                  <div style={{background:'#1e2435',border:'1px solid #2e3650',borderRadius:'7px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                    <span style={{fontSize:'10px',color:'#555e78',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'monospace'}}>{shareUrl}</span>
                    <button onClick={()=>{navigator.clipboard.writeText(shareUrl);showMsg('✓ Link copied!')}} style={{background:'#f4a829',border:'none',borderRadius:'5px',padding:'4px 10px',fontSize:'10px',fontWeight:700,color:'#000',cursor:'pointer',flexShrink:0}}>Copy</button>
                  </div>
                  <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                    <div style={{flex:1,background:'#1e2435',border:'1px solid #2e3650',borderRadius:'6px',padding:'6px 10px',fontSize:'10px',color:permColors[sharePermission],fontWeight:600,textAlign:'center',textTransform:'capitalize'}}>{sharePermission} permission{sharePassword?' · 🔒 Password protected':''}{shareExpiry?' · Expires '+shareExpiry:''}</div>
                  </div>
                  <button onClick={revokeShareLink} style={{width:'100%',padding:'8px',background:'#2a0e0e',border:'1px solid #7a1f1f',borderRadius:'7px',fontSize:'12px',fontWeight:600,color:'#f87171',cursor:'pointer',fontFamily:'inherit'}}>Revoke this link</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
