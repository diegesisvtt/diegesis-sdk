---
'@diegesis/canvas': minor
---

`Canvas` agora pausa o loop de render automaticamente quando o host fica invisível (ex.: aba oculta com `display: none` em um tabset) ou a aba do navegador vai para segundo plano, retomando o render ao voltar a ser visível — um canvas oculto não consome mais GPU/CPU continuamente. Nova option `autoPause` (default `true`; desative para render contínuo/offscreen) e API manual `pause()`/`resume()`/`paused`.
