<script lang="ts">

    import { animate } from 'motion';

    type Item={eyebrow:string;title:string;detail:string;accent:'cyan'|'green'|'purple'};
    type Props={items?:Item[];title?:string;description?:string};
    let { items=[{ eyebrow:'01',title:'Operación conectada',detail:'Procesos que comparten información sin perder contexto.',accent:'cyan'},{eyebrow:'02',title:'Control por permisos',detail:'El acceso se adapta a las responsabilidades de cada usuario.',accent:'green'},{eyebrow:'03',title:'Información centralizada',detail:'Una misma plataforma para trabajar y controlar la operación.',accent:'purple'}],title='Un ecosistema pensado para trabajar conectado',description='ÁbacoPhy reúne operación, control y seguridad en una experiencia coherente.'}:Props=$props();
    let container=$state<HTMLElement>(),cells=$state<(HTMLElement|undefined)[]>([]);
    $effect(()=>{
        if(!container)
            return;
        const observer=new IntersectionObserver(([entry])=>{
                if(!entry.isIntersecting)
                    return;
                cells.forEach(
                    (cell,index)=>cell&&animate(
                        cell,{
                            opacity:[0,1],y:[22,0],filter:['blur(7px)','blur(0px)']
                        },
                        {
                            duration:.55,delay:index*.08,ease:[.22,1,.36,1]
                        }
                    )
                );
                observer.unobserve(container!)
            },{threshold:.15}
        );
        observer.observe(container);return()=>observer.disconnect()
    });
</script>
<section bind:this={container} class="proof" aria-labelledby="proof-title"><header class="proof-header"><div><p class="proof-kicker">POR QUÉ ÁBACOPHY</p><h2 id="proof-title">{title}</h2></div><p>{description}</p></header><div class="proof-grid">{#each items as item,index}<article bind:this={cells[index]} class="proof-item {item.accent}"><div class="proof-number">{item.eyebrow}</div><div class="proof-copy"><strong>{item.title}</strong><span>{item.detail}</span></div></article>{/each}</div></section>
<style>
.proof{width:100%;color:var(--color-text-primary)}.proof-header{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,.8fr);gap:30px;align-items:end;margin-bottom:14px}.proof-kicker{margin:0 0 6px;color:var(--accent-cyan);font-size:.62rem;font-weight:850;letter-spacing:.16em}h2{margin:0;max-width:620px;font-size:clamp(1.2rem,2vw,1.65rem);line-height:1.08;letter-spacing:-.035em}.proof-header>p{margin:0;color:var(--color-text-muted);font-size:.72rem;line-height:1.55}.proof-grid{display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid var(--login-proof-border)}.proof-item{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:13px;padding:16px 15px;opacity:0;border-right:1px solid var(--login-proof-border);background:var(--login-proof-bg)}.proof-item:last-child{border-right:0}.proof-number{width:27px;height:27px;display:grid;place-items:center;border-radius:9px;background:var(--proof-accent-soft);color:var(--proof-accent);font-size:.63rem;font-weight:850}.proof-copy strong,.proof-copy span{display:block}.proof-copy strong{color:var(--color-text-primary);font-size:.74rem}.proof-copy span{margin-top:3px;color:var(--color-text-muted);font-size:.64rem;line-height:1.4}.proof-item.cyan{--proof-accent:var(--accent-cyan);--proof-accent-soft:rgba(97,230,225,.11)}.proof-item.green{--proof-accent:var(--accent-green);--proof-accent-soft:rgba(183,245,106,.11)}.proof-item.purple{--proof-accent:var(--accent-purple);--proof-accent-soft:rgba(156,130,255,.11)}@media(max-width:760px){.proof-header{grid-template-columns:1fr;gap:8px}.proof-grid{grid-template-columns:1fr}.proof-item{border-right:0;border-bottom:1px solid var(--login-proof-border)}.proof-item:last-child{border-bottom:0}}@media(prefers-reduced-motion:reduce){.proof-item{opacity:1}}
</style>