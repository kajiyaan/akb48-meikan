// MV一覧(/mv/)の絞り込みと再生。動画は押したときに初めてYouTubeを読み込む
(function(){
var $=function(id){return document.getElementById(id)};
var cards=[].slice.call(document.querySelectorAll(".mvc")),secs=[].slice.call(document.querySelectorAll(".mvsec"));
var st={q:"",m:"",c:"",k:"",p:""};
var nq=function(t){return (t||"").normalize("NFKC").toLowerCase().replace(/\s/g,"")};
var prm=new URLSearchParams(location.search);["q","m","c","k","p"].forEach(function(k){if(prm.get(k))st[k]=prm.get(k)});

function visible(){return cards.filter(function(c){return !c.hidden})}
function apply(){
 var q=nq(st.q),n=0;
 cards.forEach(function(c){var ok=(!q||c.dataset.q.indexOf(q)>=0)&&(!st.m||c.dataset.ms.indexOf(" "+st.m+" ")>=0)&&(!st.c||c.dataset.c.indexOf(" "+st.c+" ")>=0)&&(!st.k||c.dataset.k===st.k)&&(!st.p||c.dataset.p===st.p);c.hidden=!ok;if(ok)n++});
 secs.forEach(function(s){s.hidden=!s.querySelector(".mvc:not([hidden])")});
 var lab=[];if(st.m)lab.push($("mvM").selectedOptions[0].text.replace(/\(\d+\)$/,"")+"が歌う");if(st.c)lab.push("センター "+$("mvC").selectedOptions[0].text.replace(/\(\d+\)$/,""));
 $("mvN").textContent=(lab.length?lab.join("・")+" ":"")+n+"曲";$("mvNone").hidden=n>0;
 var any=st.q||st.m||st.c||st.k||st.p;$("mvReset").hidden=!any;
 var u=new URLSearchParams();Object.keys(st).forEach(function(k){if(st[k])u.set(k,st[k])});history.replaceState(null,"",location.pathname+(u.toString()?"?"+u:""));
}
function chips(id,key){var box=$(id);[].forEach.call(box.querySelectorAll("button"),function(b){b.classList.toggle("on",(b.dataset[key]||"")===st[key]);b.onclick=function(){st[key]=b.dataset[key]||"";chips(id,key);apply()}})}
$("mvQ").value=st.q;$("mvM").value=st.m;$("mvC").value=st.c;if($("mvM").value!==st.m)st.m="";if($("mvC").value!==st.c)st.c="";
$("mvQ").addEventListener("input",function(){st.q=this.value;apply()});
$("mvM").addEventListener("change",function(){st.m=this.value;apply()});
$("mvC").addEventListener("change",function(){st.c=this.value;apply()});
chips("mvK","k");chips("mvP","p");
$("mvReset").addEventListener("click",function(e){e.preventDefault();st={q:"",m:"",c:"",k:"",p:""};$("mvQ").value="";$("mvM").value="";$("mvC").value="";chips("mvK","k");chips("mvP","p");apply()});

// ---- 再生 ----
var player=null,ready=false,pending=null,queue=[],qi=-1;
function loadApi(cb){if(window.YT&&YT.Player){cb();return}var prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=function(){if(prev)prev();cb()};var s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";document.head.appendChild(s)}
function titleOf(c,v){var t=c?c.dataset.t:"";var alt=c&&v!==c.dataset.v?c.querySelector('.mvalt[data-v="'+v+'"]'):null;return t+(alt?"("+alt.textContent+")":"")}
function show(v,c){
 $("mvPl").hidden=false;$("mvNow").textContent=titleOf(c,v);$("mvYt").href="https://www.youtube.com/watch?v="+v;
 cards.forEach(function(x){x.classList.toggle("now",x===c)});
 $("mvPrev").disabled=qi<=0;$("mvNext").disabled=qi<0||qi>=queue.length-1;
 if(player&&ready){player.loadVideoById(v)}else{pending=v;if(!player)loadApi(function(){player=new YT.Player("mvFrame",{host:"https://www.youtube-nocookie.com",videoId:pending,playerVars:{autoplay:1,rel:0,playsinline:1},
  events:{onReady:function(){ready=true;if(pending)player.loadVideoById(pending);pending=null},onStateChange:function(e){if(e.data===0&&$("mvCont").checked)step(1)},onError:function(){$("mvNow").textContent=titleOf(c,v)+" ・ この動画はここでは再生できません。YouTubeで開いてください";if($("mvCont").checked&&qi>=0&&qi<queue.length-1)setTimeout(function(){step(1)},2500)}}})})}
 var top=$("mvPl").getBoundingClientRect().top;if(top<0||top>innerHeight*0.6)$("mvPl").scrollIntoView({behavior:"smooth",block:"start"});
}
function playQueue(list,i){queue=list;qi=i;var c=queue[qi];if(c)show(c.dataset.v,c)}
function step(d){if(qi+d>=0&&qi+d<queue.length)playQueue(queue,qi+d)}
$("mvPrev").onclick=function(){step(-1)};$("mvNext").onclick=function(){step(1)};
$("mvClose").onclick=function(){if(player&&ready)player.stopVideo();$("mvPl").hidden=true;cards.forEach(function(x){x.classList.remove("now")})};
document.addEventListener("click",function(e){
 var t=e.target.closest&&e.target.closest(".mvc .mvth, .mvc .mvalt");if(!t)return;var c=t.closest(".mvc");var vis=visible();
 if(t.classList.contains("mvalt")){queue=vis;qi=vis.indexOf(c);show(t.dataset.v,c);return}
 playQueue(vis,vis.indexOf(c));
});
$("mvAll").onclick=function(){var v=visible();if(v.length)playQueue(v,0)};
$("mvRand").onclick=function(){var v=visible();if(!v.length)return;var i=Math.floor(Math.random()*v.length);playQueue(v,i)};

// ---- 今日の1曲(日付で決まる。誰が見ても同じ曲) ----
(function(){var d=new Date(),k=d.getFullYear()*372+d.getMonth()*31+d.getDate();var pool=cards.filter(function(c){return c.dataset.k!=="o"});if(!pool.length)return;
 var c=pool[(k*7919)%pool.length],sub=c.querySelector(".mvi span");var box=$("mvToday");
 box.innerHTML='<b>今日の1曲</b><span class="mvtt"></span><span class="muted small"></span><button type="button" class="pick1">▶ 再生</button>';
 box.querySelector(".mvtt").textContent="「"+c.dataset.t+"」";box.querySelector(".small").textContent=sub?sub.textContent:"";
 box.querySelector("button").onclick=function(){playQueue([c],0)};})();
apply();
if(prm.get("play")==="1"){var v=visible();if(v.length)playQueue(v,0)}
})();
