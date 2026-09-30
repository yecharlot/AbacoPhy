<script lang="ts">
  type Props = {
    offLabel?: string; onLabel?: string; color?: string; background?: string; onColor?: string; onBackground?: string;
    size?: 'sm' | 'md' | 'lg'; radius?: number; ringAmplitude?: number; ringPasses?: number; ringDecay?: number;
    ringDuration?: number; ringPivot?: number; crossfadeMs?: number; revealBounce?: number; badge?: boolean;
    badgeColor?: string; waves?: boolean; clapper?: boolean; disabled?: boolean; pressed?: boolean;
    defaultPressed?: boolean; onChange?: (pressed: boolean) => void; className?: string;
  };
  let {
    offLabel='Notify me',onLabel="You'll be notified",color='#F5EFE9',background='#3A312A',onColor='#1D1814',
    onBackground='#F5EFE9',size='md',radius=22,ringAmplitude=17,ringPasses=5,ringDecay=1,ringDuration=820,
    ringPivot=16,crossfadeMs=200,revealBounce=0,badge=true,badgeColor='#ef4444',waves=true,clapper=false,
    disabled=false,pressed,defaultPressed=false,onChange,className=''
  }: Props = $props();
  let inner=$state(defaultPressed); const on=$derived(pressed ?? inner); let glyph:HTMLSpanElement;
  const sizes={sm:{h:36,fs:12.5,icon:15,px:12,gap:8},md:{h:44,fs:13.5,icon:19,px:15,gap:9},lg:{h:52,fs:15,icon:23,px:18,gap:10}};
  const bellPath='M6 16.5V10a6 6 0 0 1 12 0v6.5l1.6 2.3H4.4L6 16.5z';
  function swing(){if(!glyph||!on||matchMedia('(prefers-reduced-motion: reduce)').matches)return;glyph.animate(
    [{transform:'rotate(0deg)'},{transform:'rotate(-'+ringAmplitude+'deg)'},{transform:'rotate('+ringAmplitude*.72+'deg)'},{transform:'rotate(-'+ringAmplitude*.38+'deg)'},{transform:'rotate(0deg)'}],
    {duration:ringDuration,easing:'cubic-bezier(.77,0,.175,1)'});
  }
  function toggle(){if(disabled)return;const next=!on;if(pressed===undefined)inner=next;onChange?.(next);queueMicrotask(swing);}
</script>
<span class={"bell-toggle "+className} data-on={on} data-disabled={disabled}
  style={"--bt-color:"+color+";--bt-bg:"+background+";--bt-on-color:"+onColor+";--bt-on-bg:"+onBackground+";--bt-radius:"+radius+"px;--bt-fade:"+crossfadeMs+"ms;--bt-pivot:"+ringPivot+"%;--bt-h:"+sizes[size].h+"px;--bt-fs:"+sizes[size].fs+"px;--bt-icon:"+sizes[size].icon+"px;--bt-px:"+sizes[size].px+"px;--bt-gap:"+sizes[size].gap+"px;--bt-badge:"+badgeColor+";"}>
  <button type="button" aria-pressed={on} aria-label={on ? onLabel : offLabel} disabled={disabled} onclick={toggle}>
    <span class="icon-wrap" aria-hidden="true">
      <span bind:this={glyph} class="glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={bellPath}/><path d="M12 2.5V4"/><path d="M13 18.5H11"/></svg></span>
      {#if waves}<span class="wave left"></span><span class="wave right"></span>{/if}
      {#if badge}<span class="badge" class:show={on}></span>{/if}
    </span>
    <span class="labels" aria-hidden="true"><span class="label" class:visible={!on}>{offLabel}</span><span class="label" class:visible={on}>{onLabel}</span></span>
  </button>
</span>
<style>
.bell-toggle{display:inline-grid;grid-template-columns:max-content;user-select:none}
button{grid-area:1/1;height:var(--bt-h);padding:0 var(--bt-px);gap:var(--bt-gap);display:inline-flex;align-items:center;border:0;border-radius:var(--bt-radius);background:var(--bt-bg);color:var(--bt-color);font:600 var(--bt-fs)/1 var(--ap-font,system-ui);letter-spacing:.01em;cursor:pointer;transition:background-color var(--bt-fade) ease,color var(--bt-fade) ease,transform 160ms ease;box-shadow:0 8px 24px rgba(0,0,0,.18)}
[data-on="true"] button{background:var(--bt-on-bg);color:var(--bt-on-color)} button:hover:not(:disabled){transform:translateY(-1px)}button:active:not(:disabled){transform:scale(.97)}button:disabled{opacity:.55;cursor:default}
.icon-wrap{position:relative;display:grid;width:var(--bt-icon);height:var(--bt-icon);flex:none}.glyph{grid-area:1/1;width:100%;height:100%;transform-origin:50% var(--bt-pivot);display:grid;place-items:center}.glyph svg{width:100%;height:100%}
.labels{display:inline-grid;height:18px;min-width:max-content}.label{grid-area:1/1;opacity:0;filter:blur(2px);transition:opacity var(--bt-fade) ease,filter var(--bt-fade) ease}.label.visible{opacity:1;filter:none}
.wave{position:absolute;top:-3px;width:14px;height:14px;border:1.6px solid currentColor;border-bottom:0;border-left:0;border-radius:0 14px 0 0;opacity:0;pointer-events:none}.wave.left{right:calc(100% - 2px);transform:rotate(180deg)}.wave.right{left:calc(100% - 2px)}button:active .wave{animation:wave 520ms ease-out}
.badge{position:absolute;right:-7px;top:-6px;width:8px;height:8px;border-radius:50%;background:var(--bt-badge);opacity:0;transform:scale(.5);transition:.2s ease}.badge.show{opacity:1;transform:scale(1)}
@keyframes wave{0%{opacity:.8;transform:scale(.55)}100%{opacity:0;transform:scale(1.25)}}@media(prefers-reduced-motion:reduce){button,.label,.badge{transition:none}button:hover:not(:disabled),button:active:not(:disabled){transform:none}.wave{animation:none!important}}
</style>