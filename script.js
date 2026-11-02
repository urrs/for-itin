(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const intro = $('#intro'), game = $('#gameSection'), ending = $('#ending');
  const board = $('#board'), movesEl = $('#moves'), matchedEl = $('#matched'), timerEl = $('#timer');
  const progress = $('#progressFill'), toast = $('#toast');
  const catalog = {
    moon:   {src:'assets/images/moon.svg',   alt:'Bulan sabit dan bintang', label:'moonlight'},
    flower: {src:'assets/images/flower.svg', alt:'Bunga merah muda', label:'little bloom'},
    teddy:  {src:'assets/images/teddy.svg',  alt:'Boneka beruang', label:'soft hugs'},
    star:   {src:'assets/images/star.svg',   alt:'Bintang bercahaya', label:'stardust'}
  };
  let first=null, second=null, lock=false, moves=0, matched=0, seconds=0, clock=null, toastTimer=null;
  const starLayer=$('#starLayer');

  // Twinkling stars plus a restrained stream of drifting/falling stars.
  for(let i=0;i<34;i++){
    const s=document.createElement('span');s.className='star';s.textContent=['✦','·','✧','⋆'][i%4];
    s.style.left=(Math.random()*100)+'%';s.style.top=(Math.random()*100)+'%';
    s.style.fontSize=(6+Math.random()*9)+'px';s.style.setProperty('--dur',(2.3+Math.random()*4)+'s');
    s.style.setProperty('--delay',(-Math.random()*5)+'s');starLayer.appendChild(s);
  }
  for(let i=0;i<17;i++){
    const s=document.createElement('span');s.className='falling-star';s.textContent=['✦','✧','⋆','·'][i%4];
    s.style.setProperty('--left',(Math.random()*100)+'%');
    s.style.setProperty('--size',(7+Math.random()*10)+'px');
    s.style.setProperty('--fall-time',(12+Math.random()*17)+'s');
    s.style.setProperty('--fall-delay',(-Math.random()*27)+'s');
    s.style.setProperty('--drift',(Math.random()*130-65)+'px');
    s.style.setProperty('--star-opacity',(0.28+Math.random()*.34).toFixed(2));
    starLayer.appendChild(s);
  }
  const shooting=document.createElement('div');shooting.className='shooting-star';document.body.appendChild(shooting);

  function showToast(message){
    toast.textContent=message;toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2100);
  }
  function timeText(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
  function startClock(){clearInterval(clock);seconds=0;timerEl.textContent='00:00';clock=setInterval(()=>{seconds++;timerEl.textContent=timeText(seconds)},1000)}
  function syncCard(card,key){
    const item=catalog[key];
    card.dataset.card=key;
    const img=$('img',card), label=$('.card-front span',card);
    img.src=item.src;img.alt=item.alt;label.textContent=item.label;
    card.classList.remove('flipped','matched','is-hovered');
    card.style.setProperty('--glow','0');
    card.setAttribute('aria-label','Kartu tertutup');
  }
  function shuffleCards(){
    const cards=$$('.memory-card');
    const keys=cards.map(c=>c.dataset.card);
    for(let i=keys.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]]}
    // Update the picture and its matching key together, so a pair can never lie.
    cards.forEach((card,i)=>syncCard(card,keys[i]));
  }
  function reset(){
    clearInterval(clock);first=second=null;lock=false;moves=0;matched=0;
    movesEl.textContent='00';matchedEl.innerHTML='0 <i>/ 4</i>';progress.style.width='0%';
    shuffleCards();startClock();
  }
  function openGame(){
    intro.classList.add('hidden');ending.classList.add('hidden');game.classList.remove('hidden');
    reset();game.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function burstAt(x,y,count=13){
    const glyphs=['♡','✦','✧','✿','⋆'];
    for(let i=0;i<count;i++){
      const p=document.createElement('span');p.className='confetti';p.textContent=glyphs[i%glyphs.length];
      p.style.left=x+'px';p.style.top=y+'px';p.style.color=i%2?'#f2acd7':'#c9a8fa';
      p.style.fontSize=(12+Math.random()*10)+'px';
      p.style.setProperty('--x',(Math.random()*240-120)+'px');
      p.style.setProperty('--y',(Math.random()*-190-20)+'px');
      document.body.appendChild(p);setTimeout(()=>p.remove(),1500);
    }
  }
  function finish(){
    clearInterval(clock);
    setTimeout(()=>{
      game.classList.add('hidden');ending.classList.remove('hidden');
      ending.scrollIntoView({behavior:'smooth',block:'start'});
      burstAt(innerWidth/2,innerHeight*.45,28);
    },700);
  }
  function addRipple(card,x,y){
    const r=document.createElement('span');r.className='card-ripple';
    const rect=card.getBoundingClientRect();
    r.style.left=(x-rect.left)+'px';r.style.top=(y-rect.top)+'px';
    card.appendChild(r);setTimeout(()=>r.remove(),700);
  }
  function flip(card,event){
    if(lock||card.classList.contains('flipped')||card.classList.contains('matched'))return;
    const rect=card.getBoundingClientRect();
    const x=event?.clientX ?? rect.left+rect.width/2;
    const y=event?.clientY ?? rect.top+rect.height/2;
    addRipple(card,x,y);
    card.classList.add('flipped');card.setAttribute('aria-label',catalog[card.dataset.card].alt);
    if(!first){first=card;return}
    second=card;moves++;movesEl.textContent=String(moves).padStart(2,'0');
    if(first.dataset.card===second.dataset.card){
      first.classList.add('matched');second.classList.add('matched');
      first.setAttribute('aria-label','Pasangan '+catalog[first.dataset.card].label+' ditemukan');
      second.setAttribute('aria-label','Pasangan '+catalog[second.dataset.card].label+' ditemukan');
      matched++;matchedEl.innerHTML=matched+' <i>/ 4</i>';progress.style.width=(matched/4*100)+'%';
      const r=card.getBoundingClientRect();burstAt(r.left+r.width/2,r.top+r.height/2,18);
      first=second=null;
      if(matched===4)finish();
    }else{
      lock=true;const a=first,b=second;first=second=null;
      setTimeout(()=>{
        a.classList.remove('flipped');b.classList.remove('flipped');
        a.setAttribute('aria-label','Kartu tertutup');b.setAttribute('aria-label','Kartu tertutup');lock=false;
      },920);
    }
  }
  // Pointer-following soft glow on desktop; touch gets a tap ripple on every card.
  board.addEventListener('pointermove',e=>{
    const card=e.target.closest('.memory-card');if(!card||e.pointerType==='touch')return;
    const r=card.getBoundingClientRect();
    card.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
    card.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
    card.style.setProperty('--glow','1');card.classList.add('is-hovered');
  });
  board.addEventListener('pointerout',e=>{
    const card=e.target.closest('.memory-card');
    if(card&&!card.contains(e.relatedTarget)){card.style.setProperty('--glow','0');card.classList.remove('is-hovered')}
  });
  board.addEventListener('click',e=>{const card=e.target.closest('.memory-card');if(card)flip(card,e)});
  $('#startBtn').addEventListener('click',openGame);
  $('#restartBtn').addEventListener('click',()=>{reset();showToast('Kartu diacak ulang ✦')});
  $('#againBtn').addEventListener('click',()=>{openGame();window.scrollTo({top:0,behavior:'smooth'})});
  $('#copyBtn').addEventListener('click',async()=>{
    const message='Maafin aku, sayang. Aku sadar menonton konten itu bikin kamu dak nyaman. Aku dk bermaksud buat Itin kecewa atau sakit. Aku gek menghindari kelakuan yang dk Itin suka.\n\nMaafin aku, Itin.';
    try{await navigator.clipboard.writeText(message);showToast('Pesannya berhasil disalin ♡')}
    catch{showToast('Browser belum mengizinkan salin otomatis.')} 
  });
})();