"""Export the current approved native theme and static preview, then optionally push."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,subprocess,tempfile
from datetime import datetime
from zoneinfo import ZoneInfo
parser=argparse.ArgumentParser()
parser.add_argument('--source',default=str(Path.home()/'Desktop/exodus'))
parser.add_argument('--repo',default=str(Path.home()/'Documents/GitHub/exodus-storefront'))
parser.add_argument('--push',action='store_true')
args=parser.parse_args()
source=Path(args.source).resolve()
repo=Path(args.repo).resolve()
expected_remote='https://github.com/lopoch123456-dotcom/exodus-storefront.git'
base='/exodus-storefront'
origin='https://lopoch123456-dotcom.github.io'
assert repo.name=='exodus-storefront' and repo.parent.name=='GitHub'
def run(cmd,cwd):
    subprocess.run(cmd,cwd=cwd,check=True)
run(['npm.cmd','run','preview:build'],source/'storefront')
run(['node','tools/verify-sample-search.mjs'],source/'storefront')
policy=json.loads((source/'project-management/website/assets/media-clearance.json').read_text(encoding='utf-8'))
allowed={e['file']:e['sha256'] for e in policy['allowed_delivery_media']}
repo.mkdir(parents=True,exist_ok=True)
if (repo/'.git').exists():
    remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=repo,text=True).strip()
    assert remote==expected_remote,'Unexpected repository remote'
    status=subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True)
    if status.strip(): raise RuntimeError('Review existing uncommitted changes before publishing')
elif list(repo.iterdir()):
    raise RuntimeError('Destination must be empty for initial export')
with tempfile.TemporaryDirectory(prefix='exodus-public-') as temp:
    stage=Path(temp)
    assets=0
    for item in (source/'storefront/theme').rglob('*'):
        if item.is_symlink(): raise RuntimeError('Symlink is not allowed')
        if not item.is_file() or item.suffix=='.zip': continue
        rel=item.relative_to(source/'storefront/theme')
        assert rel.parts[0] in ['assets','blocks','config','layout','locales','sections','snippets','templates']
        if item.suffix.lower() in ['.png','.jpg','.jpeg','.webp','.avif','.gif','.mp4','.webm','.svg','.glb','.gltf','.otf','.ttf']:
            key=item.relative_to(source).as_posix()
            assert hashlib.sha256(item.read_bytes()).hexdigest()==allowed.get(key),key
            assets+=1
        target=stage/'theme'/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(item,target)
    pages=0
    for item in (source/'storefront/preview').rglob('*'):
        if not item.is_file(): continue
        rel=item.relative_to(source/'storefront/preview')
        if '__fixtures' in rel.parts or 'gallery-study' in rel.parts: continue
        if item.suffix not in ['.html','.js','.css','.jpg','.jpeg','.png','.webp','.avif','.gif','.mp4','.webm','.svg','.glb','.gltf','.otf','.ttf']: continue
        target=stage/'docs'/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        if item.suffix=='.html':
            text=item.read_text(encoding='utf-8')
            text=text.replace('http://127.0.0.1:8766',origin+base)
            text=re.sub(r'(["\x27])/(?!/)',lambda m:m.group(1)+base+'/',text)
            text=text.replace('<meta name="viewport"','<meta name="robots" content="noindex,nofollow"><meta name="viewport"',1)
            assert '/__fixtures/' not in text,rel
            assert 'TEST FIXTURE' not in text,rel
            target.write_text(text,encoding='utf-8')
            pages+=1
        elif rel.as_posix()=='preview-only.js':
            text=item.read_text(encoding='utf-8')
            text=text.replace("location.pathname.replace(/^/","location.pathname.replace(/^/",1)
            text=text.replace("const base=url.pathname.replace(", "const base=url.pathname.slice("+str(len(base))+").replace(")
            text=text.replace("url.pathname=(lang", "url.pathname='"+base+"'+(lang")
            target.write_text(text,encoding='utf-8')
        else:
            if rel.parts[0]=='assets' and item.suffix.lower() not in ['.js','.css']:
                theme_item=source/'storefront/theme/assets'/item.name
                assert theme_item.is_file() and item.read_bytes()==theme_item.read_bytes(),rel
            shutil.copy2(item,target)
    (stage/'docs/.nojekyll').write_text('')
    (stage/'docs/robots.txt').write_text('User-agent: *\nDisallow: /\n')
    (stage/'.gitignore').write_text('node_modules/\n.env*\n*.zip\n*.log\n.DS_Store\n')
    (stage/'README.md').write_text("""# Exodus storefront

Original Shopify native theme and its public design preview.

- Website: https://lopoch123456-dotcom.github.io/exodus-storefront/
- Native Shopify source: theme/
- GitHub Pages output: docs/ (main branch, no Jekyll)
- Collection: 23 sample/archive entries, not confirmed production inventory.
- Garment covers precede model/styling views. AI views retain their labels.
- Silver original 3D emblem, controls and reduced-motion support are retained.

This is a static preview. Checkout, payments, inventory and form delivery require
Shopify integration and acceptance; this publication does not claim live commerce.

## Daily updates

The authorized daily Exodus development task exports from the local working source:
C:/Users/geige/Desktop/exodus
into C:/Users/geige/Documents/GitHub/exodus-storefront, then commits and pushes
with tools/sync-github.py --source <source> --repo <checkout> --push.
Only the native theme and approved preview assets are exported. Raw originals,
retired model media, private reports, mail receipts, ZIP archives and dependencies
are not included. The exporter checks the approved media SHA list and strips test
fixture routes. It refuses unexpected remotes or uncommitted checkout changes.
Never force-push or commit credentials.
""",encoding='utf-8')
    (stage/'tools').mkdir()
    shutil.copy2(Path(__file__),stage/'tools/sync-github.py')
    files=[]
    for item in sorted(stage.rglob('*')):
        if item.is_file(): files.append({'path':item.relative_to(stage).as_posix(),'bytes':item.stat().st_size,'sha256':hashlib.sha256(item.read_bytes()).hexdigest()})
    manifest={'date_vancouver':datetime.now(ZoneInfo('America/Vancouver')).date().isoformat(),'source':'Current native Shopify theme','pages':pages,'approved_theme_media':assets,'static_preview_only':True,'shopify_connected':False,'files':files}
    (stage/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for name in ['theme','docs','tools']:
        target=repo/name
        if target.exists():
            assert target.resolve().parent==repo and not target.is_symlink()
            shutil.rmtree(target)
        shutil.copytree(stage/name,target)
    for name in ['README.md','.gitignore','export-manifest.json']:shutil.copy2(stage/name,repo/name)
if not (repo/'.git').exists():
    run(['git','init','-b','main'],repo)
    run(['git','remote','add','origin',expected_remote],repo)
run(['git','add','--','theme','docs','tools','README.md','.gitignore','export-manifest.json'],repo)
diff=subprocess.run(['git','diff','--cached','--quiet'],cwd=repo)
if diff.returncode==1:
    run(['git','commit','-m','Update Exodus theme and preview '+manifest['date_vancouver']],repo)
elif diff.returncode!=0: raise RuntimeError('Git diff failed')
if args.push:
    run(['git','push','--set-upstream','origin','main'],repo)
print(json.dumps({'repo':str(repo),'pages':pages,'approved_media':assets,'files':len(files),'pushed':args.push}))
