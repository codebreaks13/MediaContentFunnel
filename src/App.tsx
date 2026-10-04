import { useEffect, useRef, useState } from 'react';
import { composePoster } from './composePoster';
export default function App() {
    const canvas = useRef<HTMLCanvasElement>(null), latestLoad = useRef(0);
    const [headline, setHeadline] = useState('A new season starts here'), [sub, setSub] = useState('Synthetic example — edit the copy before export.'), [credit, setCredit] = useState('Synthetic demonstration'), [source, setSource] = useState(''), [accent, setAccent] = useState('#85e0c3'), [image, setImage] = useState<HTMLImageElement | null>(null), [rights, setRights] = useState(false), [approved, setApproved] = useState(false), [ai, setAi] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(false);
    useEffect(() => { setApproved(false); try {
        composePoster(canvas.current!, image, { headline, subheadline: sub, palette: [accent], credit, aiLabel: ai });
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }, [headline, sub, accent, image, credit, ai, source, rights]);
    const load = async (file?: File) => { if (!file)
        return; const id = ++latestLoad.current; setLoading(true); setApproved(false); setRights(false); try {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
            throw new Error('Choose a PNG, JPEG or WebP under 8 MiB.');
        const url = URL.createObjectURL(file);
        try {
            const img = new Image();
            img.src = url;
            await img.decode();
            if (img.width * img.height > 24000000)
                throw new Error('Image is too large; resize it below 24 megapixels.');
            if (id === latestLoad.current)
                setImage(img);
        }
        finally {
            URL.revokeObjectURL(url);
        }
    }
    catch (e) {
        if (id === latestLoad.current)
            setError((e as Error).message);
    }
    finally {
        if (id === latestLoad.current)
            setLoading(false);
    } };
    const download = () => { if (error || !approved || loading || (image && !rights))
        return; canvas.current?.toBlob(blob => { if (!blob)
        return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mediaforge-public-poster.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, 'image/png'); };
    return <><header><small>ODDFLOCK · LIMITED PUBLIC EDITION</small><h1>MediaForge Poster Studio</h1><p>Local photo, editable copy, one clean panel. No AI account or server needed.</p></header><main className="grid"><section className="card stack"><label>Headline<input value={headline} maxLength={180} onChange={e => setHeadline(e.target.value)}/></label><label>Supporting line<textarea value={sub} maxLength={220} onChange={e => setSub(e.target.value)}/></label><label>Accent<input type="color" value={accent} onChange={e => setAccent(e.target.value)}/></label><label>Local photograph<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void load(e.target.files?.[0])}/></label><small>{loading ? 'Loading image…' : 'Photos stay in your browser; nothing is uploaded.'}</small><label>Credit<input value={credit} maxLength={90} onChange={e => setCredit(e.target.value)}/></label><label>Source URL or editorial reference<input value={source} maxLength={500} onChange={e => setSource(e.target.value)}/></label><label className="row"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)}/>I have permission to use this photo</label><label className="row"><input type="checkbox" checked={ai} onChange={e => setAi(e.target.checked)}/>Label this as AI-generated artwork</label><label className="row"><input type="checkbox" disabled={!!error || loading} checked={approved} onChange={e => setApproved(e.target.checked)}/>I reviewed the text, source and credit</label>{error && <p role="alert" className="error">{error}</p>}<button disabled={!!error || !approved || loading || !headline.trim() || !credit.trim() || !!image && (!rights || !source.trim())} onClick={download}>Export 1080 × 1350 PNG</button><button onClick={() => { latestLoad.current++; setLoading(false); setImage(null); setRights(false); setCredit('Synthetic demonstration'); }}>Use synthetic background</button><small>Browser fonts determine Bangla shaping. Inspect the preview before exporting. Manual approval is a workflow check, not independent fact verification.</small></section><section className="card"><canvas ref={canvas} aria-label="Poster preview"/><p>Full product features such as news mining, model generation, private templates and automated publishing are not included.</p></section></main></>;
}
