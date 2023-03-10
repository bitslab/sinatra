var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

if(!htr("hittail_ok")){htc=document.referrer;htz=htl(document.location.href);if(htz!=htl(htc)&&""!=htc){if(htw(htc)){kw=htq(htc);htI=/\.google\./;if(!htI.test(htc)||kw.length>0){htc=htA(htc);htAdt=htAdTk(document.location.href,htc);var i=document.createElement("img");i.width="1";i.height="1";i.setAttribute("src",location.protocol+"//web.archive.org/web/20140810105400/https://www.hittail.com/activity_tracking?ref="+encodeURIComponent(htc)+"&kw="+encodeURIComponent(kw)+"&eng="+encodeURIComponent(htm(htc))+"&p="+htF(htc)+"&n="+htn(kw)+"&adt="+htAdt+"&han="+han(kw));var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(i,s)}}}hty("hittail_ok","1","","/",document.domain,"")}function han(hte){htI=/[\u4e00-\u9fff]/;if(htI.test(hte)){return 1}else{return 0}}function htA(ref){ref=ref.replace(/bs=.+?&/g,"");ref=ref.replace(/oq=.+?&/g,"");ref=ref.replace(/sug=.+?&/g,"");return ref}function htw(hte){var htd=true;var htj=new Array("https://web.archive.org/web/20140810105400/http://private.","https://web.archive.org/web/20140810105400/http://internal.","https://web.archive.org/web/20140810105400/http://intranet.","login=","/login","login\\.","logon=","/logon","logon\\.","/signin","signin=","signin\\.","signon","/admin/","mail\\.","/mail/","/email/","webmail","mailbox","cache:","https://web.archive.org/web/20140810105400/http://www.blogger.com","https://web.archive.org/web/20140810105400/http://localhost","https://web.archive.org/web/20140810105400/http://client.","https://web.archive.org/web/20140810105400/http://docs.","https://web.archive.org/web/20140810105400/http://timebase.","https://web.archive.org/web/20140810105400/http://www2.blogger.","https://web.archive.org/web/20140810105400/http://www.typepad.com/t/app/","https://web.archive.org/web/20140810105400/http://www.typepad.com/t/comments","https://web.archive.org/web/20140810105400/http://blockedreferrer","q=&");for(i=0;i<htj.length;i++){if(hte.search(htj[i])>-1){htd=false;return htd}}var htE=/https?:\/\/(www\.|\d+\.)?hittail\.com/;var hto=/https?:\/\/(www\.|\d+\.)?mylongtail\.com/;if(hte.search(htE)>-1||hte.search(hto)>-1){htd=false}return htd}function htk(hta){try{htr=decodeURIComponent(hta.replace(/\+/g," "))}catch(err){htr=encodeURIComponent(hta)}return htr}function htm(url){var htH=/(http:\/\/)([^\/]*?)(\/)/;htH.test(url);hti=RegExp.$2;return hti}function htq(url){var htG=/(\?|&|&amp;|;){1}(q|p|query|t|w|search|as_q|wd|word|keyword){1}=(.[^&=]*)=?/i;htG.test(url);kw=htk(RegExp.$3);if(kw.indexOf("cache:")>=0||kw.indexOf("http://")>=0||kw.indexOf("invocationType")>=0||kw.indexOf("fc097d7d519a4fe598a9d20316bcaafb")>=0||kw.indexOf("nr_rc_link")>=0||!isNaN(kw)){kw=""}else{kw=htD(kw)}return kw}function htD(hta){hta=hta.replace(/[><#!\+"'\.\-^]/g,"");return hta}function htF(url){p=0;htI=/\.google\./;if(htI.test(url)){htJ=/google(.*?)(cd=)([0-9]+)/;htJ.test(url);p=RegExp.$3;if(""!=p){p=Math.ceil(p/10)}else{htJ=/google(.*?)(?!imgres)(.*?)(start=)([0-9]+)/;htJ.test(url);p=RegExp.$5;if(""!=p){p=Math.ceil(p/10)}else{p=1}}}if(0==p||""==p){hts=/\.yahoo\./;if(hts.test(url)){htt=/yahoo(.*?)b=([0-9]+)/;htt.test(url);p=RegExp.$2;if(""!=p){p=(p-1)/10+1}else{p=1}}}if(0==p||""==p){htg=/msn\.com/;if(htg.test(url)){htp=/msn\.com(.*?)(\?|&)p=([0-9]+)/;htp.test(url);p=RegExp.$3;if(""!=p){p=p}else{p=1}}}if(0==p||""==p){htg=/bing\.com/;if(htg.test(url)){htp=/bing\.com(.*?)(\?|&)first=([0-9]+)/;htp.test(url);p=RegExp.$3;if(""!=p){p=Math.ceil(p/10)}else{p=1}}}if(0==p||""==p){htg=/baidu\.com/;if(htg.test(url)){htB=/baidu(.*?)(\?|&)pn=([0-9]+)/;htB.test(url);p=RegExp.$3;if(""!=p){p=p/10+1}else{p=1}}}if(0==p||""==p){htg=/sogou\.com/;if(htg.test(url)){htB=/sogou(.*?)(\?|&)page=([0-9]+)/;htB.test(url);p=RegExp.$3;if(""!=p){p=p}else{p=1}}}if(0==p||""==p){htg=/ask\.com/;if(htg.test(url)){htB=/ask(.*?)(\?|&)page=([0-9]+)/;htB.test(url);p=RegExp.$3;if(""!=p){p=(p-1)/10}else{p=1}}}return p}function htn(hta){hta=hta.replace(/^\s+|\s+$/g,"");var htv=hta.split(/\s/);w=htv.length;return w}function hty(name,value,expires,htf,domain,hth){var htx=name+"="+escape(value)+(htf?"; htf="+htf:"")+(domain?"; domain="+domain:"")+(hth?"; hth":"");document.cookie=htx}function htr(name){var dc=document.cookie;var prefix=name+"=";var htb=dc.indexOf("; "+prefix);if(htb==-1){htb=dc.indexOf(prefix);if(0!=htb){return null}}else{htb+=2}var end=document.cookie.indexOf(";",htb);if(end==-1){end=dc.length}return unescape(dc.substring(htb+prefix.length,end))}function htl(url){var htb,end;htb=url.indexOf("//")+2;if(url.indexOf("/",8)){end=url.indexOf("/",8)}else{end=url.length}return url.substring(htb,end)}function htAdTk(url,ref){if(url.indexOf("gclid")>0||ref.indexOf("aclk")>0||url.indexOf("ysmkey")>0||url.indexOf("OVRAW")>0||url.indexOf("OVKEY")>0){ad=1}else{ad=0}return ad}

}
/*
     FILE ARCHIVED ON 10:54:00 Aug 10, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 21:19:00 Jul 16, 2020.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  exclusion.robots.policy: 0.226
  RedisCDXSource: 29.434
  load_resource: 85.967
  PetaboxLoader3.datanode: 46.946 (4)
  exclusion.robots: 0.243
  LoadShardBlock: 51.85 (3)
  captures_list: 97.398
  esindex: 0.019
  CDXLines.iter: 12.12 (3)
  PetaboxLoader3.resolve: 38.042
*/