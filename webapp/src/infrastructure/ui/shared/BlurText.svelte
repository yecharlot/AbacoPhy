<script lang="ts">
import { animate } from 'motion';
type Snap=Record<string,string|number>;
type Props={text?:string;delay?:number;class?:string;animateBy?:'words'|'letters';direction?:'top'|'bottom';threshold?:number;rootMargin?:string;animationFrom?:Snap;animationTo?:Snap[];easing?:string|number[]|((t:number)=>number);onAnimationComplete?:()=>void;stepDuration?:number};
let {text='',delay=200,class:className='',animateBy='words',direction='top',threshold=.1,rootMargin='0px',animationFrom,animationTo,easing=(t:number)=>t,onAnimationComplete,stepDuration=.35}:Props=$props();
const elements=$derived(animateBy==='words'?text.split(' '):text.split(''));
let inView=$state(false),containerEl=$state<HTMLParagraphElement>(),spanEls=$state<(HTMLSpanElement|undefined)[]>([]);
$effect(()=>{if(!containerEl)return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){inView=true;observer.unobserve(containerEl!)}},{threshold,rootMargin});observer.observe(containerEl);return()=>observer.disconnect()});
const defaultFrom=$derived<Snap>(direction==='top'?{filter:'blur(10px)',opacity:0,y:-50}:{filter:'blur(10px)',opacity:0,y:50});
const defaultTo=$derived<Snap[]>([{filter:'blur(5px)',opacity:.5,y:direction==='top'?5:-5},{filter:'blur(0px)',opacity:1,y:0}]);
const fromSnapshot=$derived<Snap>(animationFrom??defaultFrom),toSnapshots=$derived<Snap[]>(animationTo??defaultTo);
function buildKeyframes(from:Snap,steps:Snap[]){const keys=new Set([...Object.keys(from),...steps.flatMap(s=>Object.keys(s))]);const out:Record<string,(string|number)[]>={};keys.forEach(k=>out[k]=[from[k],...steps.map(s=>s[k])]);return out}
function transformValue(v:string|number,axis:string){return `translate${axis}(${typeof v==='number'?v+'px':v})`}
function applyInitial(el:HTMLElement,snap:Snap){let transform='';for(const[k,v]of Object.entries(snap)){if(k==='y')transform+=` ${transformValue(v,'Y')}`;else if(k==='x')transform+=` ${transformValue(v,'X')}`;else if(k==='filter')el.style.filter=String(v);else if(k==='opacity')el.style.opacity=String(v);else(el.style as unknown as Record<string,string>)[k]=String(v)}if(transform)el.style.transform=transform.trim()}
$effect(()=>{void fromSnapshot;spanEls.forEach(el=>el&&applyInitial(el,fromSnapshot))});
$effect(()=>{if(!inView||!spanEls.length)return;const stepCount=toSnapshots.length+1,totalDuration=stepDuration*Math.max(0,stepCount-1),times=Array.from({length:stepCount},(_,i)=>stepCount===1?0:i/(stepCount-1)),kf=buildKeyframes(fromSnapshot,toSnapshots),animations:{stop:()=>void}[]=[];
spanEls.forEach((el,index)=>{if(!el)return;const target:Record<string,(string|number)[]>={};for(const[k,frames]of Object.entries(kf)){if(k==='y')target.transform=frames.map(v=>transformValue(v,'Y'));else if(k==='x'){const x=frames.map(v=>transformValue(v,'X'));target.transform=target.transform?target.transform.map((v,i)=>`${v} ${x[i]}`):x}else target[k]=frames}const controls=animate(el,target as never,{duration:totalDuration,times,delay:index*delay/1000,ease:easing as never});if(index===elements.length-1&&onAnimationComplete){const finished=(controls as unknown as{finished?:Promise<unknown>}).finished;finished?.then(()=>onAnimationComplete?.()).catch(()=>{})}animations.push({stop:()=>{const c=controls as unknown as{stop?:()=>void;cancel?:()=>void};c.stop?.();c.cancel?.()}})});return()=>animations.forEach(a=>a.stop())});
</script>
<p bind:this={containerEl} class="blur-text {className}">{#each elements as segment,index (index)}<span bind:this={spanEls[index]} style="display:inline-block;will-change:transform,filter,opacity">{segment}{animateBy==='words'&&index<elements.length-1?'\u00A0':''}</span>{/each}</p>
<style>.blur-text{margin:0;display:flex;flex-wrap:wrap}.blur-text>span{white-space:pre}</style>