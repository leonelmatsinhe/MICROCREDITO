"use strict";(self["webpackChunkfront_end"]=self["webpackChunkfront_end"]||[]).push([[111],{1178:function(e,t,r){var n=r(6099),o=r(7582),i=r(4589),a=r(909),s="firebasestorage.googleapis.com",u="storageBucket",c=12e4,l=6e5,h=function(e){function t(r,n){var o=e.call(this,f(r),"Firebase Storage: "+n+" ("+f(r)+")")||this;return o.customData={serverResponse:null},o._baseMessage=o.message,Object.setPrototypeOf(o,t.prototype),o}return(0,o.__extends)(t,e),t.prototype._codeEquals=function(e){return f(e)===this.code},Object.defineProperty(t.prototype,"serverResponse",{get:function(){return this.customData.serverResponse},set:function(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=this._baseMessage+"\n"+this.customData.serverResponse:this.message=this._baseMessage},enumerable:!1,configurable:!0}),t}(i.FirebaseError);function f(e){return"storage/"+e}function p(){var e="An unknown error occurred, please check the error payload for server response.";return new h("unknown",e)}function d(e){return new h("object-not-found","Object '"+e+"' does not exist.")}function _(e){return new h("quota-exceeded","Quota for bucket '"+e+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function g(){var e="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new h("unauthenticated",e)}function v(){return new h("unauthorized-app","This app does not have permission to access Firebase Storage on this project.")}function b(e){return new h("unauthorized","User does not have permission to access '"+e+"'.")}function m(){return new h("retry-limit-exceeded","Max retry time for operation exceeded, please try again.")}function y(){return new h("canceled","User canceled the upload/download.")}function w(e){return new h("invalid-url","Invalid URL '"+e+"'.")}function R(e){return new h("invalid-default-bucket","Invalid default bucket '"+e+"'.")}function k(){return new h("no-default-bucket","No default bucket found. Did you set the '"+u+"' property when initializing the app?")}function T(){return new h("cannot-slice-blob","Cannot slice blob for upload. Please retry the upload.")}function O(){return new h("server-file-wrong-size","Server recorded incorrect upload file size, please retry the upload.")}function x(){return new h("no-download-url","The given file does not have any download URLs.")}function P(e){return new h("invalid-argument",e)}function U(){return new h("app-deleted","The Firebase app was deleted.")}function C(e){return new h("invalid-root-operation","The operation '"+e+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function S(e,t){return new h("invalid-format","String does not match format '"+e+"': "+t)}function E(e){throw new h("internal-error","Internal error: "+e)}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function A(e){return atob(e)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var I={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"},j=function(){function e(e,t){this.data=e,this.contentType=t||null}return e}();function q(e,t){switch(e){case I.RAW:return new j(M(t));case I.BASE64:case I.BASE64URL:return new j(B(e,t));case I.DATA_URL:return new j(F(t),z(t))}throw p()}function M(e){for(var t=[],r=0;r<e.length;r++){var n=e.charCodeAt(r);if(n<=127)t.push(n);else if(n<=2047)t.push(192|n>>6,128|63&n);else if(55296===(64512&n)){var o=r<e.length-1&&56320===(64512&e.charCodeAt(r+1));if(o){var i=n,a=e.charCodeAt(++r);n=65536|(1023&i)<<10|1023&a,t.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n)}else t.push(239,191,189)}else 56320===(64512&n)?t.push(239,191,189):t.push(224|n>>12,128|n>>6&63,128|63&n)}return new Uint8Array(t)}function L(e){var t;try{t=decodeURIComponent(e)}catch(r){throw S(I.DATA_URL,"Malformed data URL.")}return M(t)}function B(e,t){switch(e){case I.BASE64:var r=-1!==t.indexOf("-"),n=-1!==t.indexOf("_");if(r||n){var o=r?"-":"_";throw S(e,"Invalid character '"+o+"' found: is it base64url encoded?")}break;case I.BASE64URL:var i=-1!==t.indexOf("+"),a=-1!==t.indexOf("/");if(i||a){o=i?"+":"/";throw S(e,"Invalid character '"+o+"' found: is it base64 encoded?")}t=t.replace(/-/g,"+").replace(/_/g,"/");break}var s;try{s=A(t)}catch(l){throw S(e,"Invalid character found")}for(var u=new Uint8Array(s.length),c=0;c<s.length;c++)u[c]=s.charCodeAt(c);return u}var N=function(){function e(e){this.base64=!1,this.contentType=null;var t=e.match(/^data:([^,]+)?,/);if(null===t)throw S(I.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");var r=t[1]||null;null!=r&&(this.base64=D(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}return e}();function F(e){var t=new N(e);return t.base64?B(I.BASE64,t.rest):L(t.rest)}function z(e){var t=new N(e);return t.contentType}function D(e,t){var r=e.length>=t.length;return!!r&&e.substring(e.length-t.length)===t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var H,G={STATE_CHANGED:"state_changed"},W={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function X(e){switch(e){case"running":case"pausing":case"canceling":return W.RUNNING;case"paused":return W.PAUSED;case"success":return W.SUCCESS;case"canceled":return W.CANCELED;case"error":return W.ERROR;default:return W.ERROR}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(function(e){e[e["NO_ERROR"]=0]="NO_ERROR",e[e["NETWORK_ERROR"]=1]="NETWORK_ERROR",e[e["ABORT"]=2]="ABORT"})(H||(H={}));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var V=function(){function e(){var e=this;this.sent_=!1,this.xhr_=new XMLHttpRequest,this.errorCode_=H.NO_ERROR,this.sendPromise_=new Promise((function(t){e.xhr_.addEventListener("abort",(function(){e.errorCode_=H.ABORT,t()})),e.xhr_.addEventListener("error",(function(){e.errorCode_=H.NETWORK_ERROR,t()})),e.xhr_.addEventListener("load",(function(){t()}))}))}return e.prototype.send=function(e,t,r,n){if(this.sent_)throw E("cannot .send() more than once");if(this.sent_=!0,this.xhr_.open(t,e,!0),void 0!==n)for(var o in n)n.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,n[o].toString());return void 0!==r?this.xhr_.send(r):this.xhr_.send(),this.sendPromise_},e.prototype.getErrorCode=function(){if(!this.sent_)throw E("cannot .getErrorCode() before sending");return this.errorCode_},e.prototype.getStatus=function(){if(!this.sent_)throw E("cannot .getStatus() before sending");try{return this.xhr_.status}catch(e){return-1}},e.prototype.getResponseText=function(){if(!this.sent_)throw E("cannot .getResponseText() before sending");return this.xhr_.responseText},e.prototype.abort=function(){this.xhr_.abort()},e.prototype.getResponseHeader=function(e){return this.xhr_.getResponseHeader(e)},e.prototype.addUploadProgressListener=function(e){null!=this.xhr_.upload&&this.xhr_.upload.addEventListener("progress",e)},e.prototype.removeUploadProgressListener=function(e){null!=this.xhr_.upload&&this.xhr_.upload.removeEventListener("progress",e)},e}();function K(){return new V}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Z=function(){function e(){}return e.prototype.createConnection=function(){return K()},e}(),$=function(){function e(e,t){this.bucket=e,this.path_=t}return Object.defineProperty(e.prototype,"path",{get:function(){return this.path_},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"isRoot",{get:function(){return 0===this.path.length},enumerable:!1,configurable:!0}),e.prototype.fullServerUrl=function(){var e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)},e.prototype.bucketOnlyServerUrl=function(){var e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o"},e.makeFromBucketSpec=function(t,r){var n;try{n=e.makeFromUrl(t,r)}catch(o){return new e(t,"")}if(""===n.path)return n;throw R(t)},e.makeFromUrl=function(t,r){var n=null,o="([A-Za-z0-9.\\-_]+)";function i(e){"/"===e.path.charAt(e.path.length-1)&&(e.path_=e.path_.slice(0,-1))}var a="(/(.*))?$",u=new RegExp("^gs://"+o+a,"i"),c={bucket:1,path:3};function l(e){e.path_=decodeURIComponent(e.path)}for(var h="v[A-Za-z0-9_]+",f=r.replace(/[.]/g,"\\."),p="(/([^?#]*).*)?$",d=new RegExp("^https?://"+f+"/"+h+"/b/"+o+"/o"+p,"i"),_={bucket:1,path:3},g=r===s?"(?:storage.googleapis.com|storage.cloud.google.com)":r,v="([^?#]*)",b=new RegExp("^https?://"+g+"/"+o+"/"+v,"i"),m={bucket:1,path:2},y=[{regex:u,indices:c,postModify:i},{regex:d,indices:_,postModify:l},{regex:b,indices:m,postModify:l}],R=0;R<y.length;R++){var k=y[R],T=k.regex.exec(t);if(T){var O=T[k.indices.bucket],x=T[k.indices.path];x||(x=""),n=new e(O,x),k.postModify(n);break}}if(null==n)throw w(t);return n},e}(),J=function(){function e(e){this.promise_=Promise.reject(e)}return e.prototype.getPromise=function(){return this.promise_},e.prototype.cancel=function(e){},e}();
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Y(e,t,r){var n=1,i=null,a=!1,s=0;function u(){return 2===s}var c=!1;function l(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];c||(c=!0,t.apply(null,e))}function h(t){i=setTimeout((function(){i=null,e(f,u())}),t)}function f(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];if(!c)if(e)l.call.apply(l,(0,o.__spreadArray)([null,e],t));else{var i,f=u()||a;if(f)l.call.apply(l,(0,o.__spreadArray)([null,e],t));else n<64&&(n*=2),1===s?(s=2,i=0):i=1e3*(n+Math.random()),h(i)}}var p=!1;function d(e){p||(p=!0,c||(null!==i?(e||(s=2),clearTimeout(i),h(0)):e||(s=1)))}return h(0),setTimeout((function(){a=!0,d(!0)}),r),d}function Q(e){e(!1)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ee(e){return void 0!==e}function te(e){return"function"===typeof e}function re(e){return"object"===typeof e&&!Array.isArray(e)}function ne(e){return"string"===typeof e||e instanceof String}function oe(e){return ie()&&e instanceof Blob}function ie(){return"undefined"!==typeof Blob}function ae(e,t,r,n){if(n<t)throw P("Invalid value for '"+e+"'. Expected "+t+" or greater.");if(n>r)throw P("Invalid value for '"+e+"'. Expected "+r+" or less.")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function se(e,t){var r=t.match(/^(\w+):\/\/.+/),n=null===r||void 0===r?void 0:r[1],o=t;return null==n&&(o="https://"+t),o+"/v0"+e}function ue(e){var t=encodeURIComponent,r="?";for(var n in e)if(e.hasOwnProperty(n)){var o=t(n)+"="+t(e[n]);r=r+o+"&"}return r=r.slice(0,-1),r}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ce=function(){function e(e,t,r,n,o,i,a,s,u,c,l){var h=this;this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.url_=e,this.method_=t,this.headers_=r,this.body_=n,this.successCodes_=o.slice(),this.additionalRetryCodes_=i.slice(),this.callback_=a,this.errorCallback_=s,this.progressCallback_=c,this.timeout_=u,this.pool_=l,this.promise_=new Promise((function(e,t){h.resolve_=e,h.reject_=t,h.start_()}))}return e.prototype.start_=function(){var e=this;function t(t,r){if(r)t(!1,new le(!1,null,!0));else{var n=e.pool_.createConnection();e.pendingConnection_=n,null!==e.progressCallback_&&n.addUploadProgressListener(o),n.send(e.url_,e.method_,e.body_,e.headers_).then((function(){null!==e.progressCallback_&&n.removeUploadProgressListener(o),e.pendingConnection_=null;var r=n.getErrorCode()===H.NO_ERROR,i=n.getStatus();if(r&&!e.isRetryStatusCode_(i)){var a=-1!==e.successCodes_.indexOf(i);t(!0,new le(a,n))}else{var s=n.getErrorCode()===H.ABORT;t(!1,new le(!1,null,s))}}))}function o(t){var r=t.loaded,n=t.lengthComputable?t.total:-1;null!==e.progressCallback_&&e.progressCallback_(r,n)}}function r(t,r){var n=e.resolve_,o=e.reject_,i=r.connection;if(r.wasSuccessCode)try{var a=e.callback_(i,i.getResponseText());ee(a)?n(a):n()}catch(u){o(u)}else if(null!==i){var s=p();s.serverResponse=i.getResponseText(),e.errorCallback_?o(e.errorCallback_(i,s)):o(s)}else if(r.canceled){s=e.appDelete_?U():y();o(s)}else{s=m();o(s)}}this.canceled_?r(!1,new le(!1,null,!0)):this.backoffId_=Y(t,r,this.timeout_)},e.prototype.getPromise=function(){return this.promise_},e.prototype.cancel=function(e){this.canceled_=!0,this.appDelete_=e||!1,null!==this.backoffId_&&Q(this.backoffId_),null!==this.pendingConnection_&&this.pendingConnection_.abort()},e.prototype.isRetryStatusCode_=function(e){var t=e>=500&&e<600,r=[408,429],n=-1!==r.indexOf(e),o=-1!==this.additionalRetryCodes_.indexOf(e);return t||n||o},e}(),le=function(){function e(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}return e}();function he(e,t){null!==t&&t.length>0&&(e["Authorization"]="Firebase "+t)}function fe(e,t){e["X-Firebase-Storage-Version"]="webjs/"+(null!==t&&void 0!==t?t:"AppManager")}function pe(e,t){t&&(e["X-Firebase-GMPID"]=t)}function de(e,t){null!==t&&(e["X-Firebase-AppCheck"]=t)}function _e(e,t,r,n,o,i){var a=ue(e.urlParams),s=e.url+a,u=Object.assign({},e.headers);return pe(u,t),he(u,r),fe(u,i),de(u,n),new ce(s,e.method,u,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,o)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ge(){return"undefined"!==typeof BlobBuilder?BlobBuilder:"undefined"!==typeof WebKitBlobBuilder?WebKitBlobBuilder:void 0}function ve(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];var r=ge();if(void 0!==r){for(var n=new r,o=0;o<e.length;o++)n.append(e[o]);return n.getBlob()}if(ie())return new Blob(e);throw new h("unsupported-environment","This browser doesn't seem to support creating Blobs")}function be(e,t,r){return e.webkitSlice?e.webkitSlice(t,r):e.mozSlice?e.mozSlice(t,r):e.slice?e.slice(t,r):null}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var me=function(){function e(e,t){var r=0,n="";oe(e)?(this.data_=e,r=e.size,n=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=n}return e.prototype.size=function(){return this.size_},e.prototype.type=function(){return this.type_},e.prototype.slice=function(t,r){if(oe(this.data_)){var n=this.data_,o=be(n,t,r);return null===o?null:new e(o)}var i=new Uint8Array(this.data_.buffer,t,r-t);return new e(i,!0)},e.getBlob=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];if(ie()){var n=t.map((function(t){return t instanceof e?t.data_:t}));return new e(ve.apply(null,n))}var o=t.map((function(e){return ne(e)?q(I.RAW,e).data:e.data_})),i=0;o.forEach((function(e){i+=e.byteLength}));var a=new Uint8Array(i),s=0;return o.forEach((function(e){for(var t=0;t<e.length;t++)a[s++]=e[t]})),new e(a,!0)},e.prototype.uploadData=function(){return this.data_},e}();
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ye(e){var t;try{t=JSON.parse(e)}catch(r){return null}return re(t)?t:null}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function we(e){if(0===e.length)return null;var t=e.lastIndexOf("/");if(-1===t)return"";var r=e.slice(0,t);return r}function Re(e,t){var r=t.split("/").filter((function(e){return e.length>0})).join("/");return 0===e.length?r:e+"/"+r}function ke(e){var t=e.lastIndexOf("/",e.length-2);return-1===t?e:e.slice(t+1)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Te(e,t){return t}var Oe=function(){function e(e,t,r,n){this.server=e,this.local=t||e,this.writable=!!r,this.xform=n||Te}return e}(),xe=null;function Pe(e){return!ne(e)||e.length<2?e:ke(e)}function Ue(){if(xe)return xe;var e=[];function t(e,t){return Pe(t)}e.push(new Oe("bucket")),e.push(new Oe("generation")),e.push(new Oe("metageneration")),e.push(new Oe("name","fullPath",!0));var r=new Oe("name");function n(e,t){return void 0!==t?Number(t):t}r.xform=t,e.push(r);var o=new Oe("size");return o.xform=n,e.push(o),e.push(new Oe("timeCreated")),e.push(new Oe("updated")),e.push(new Oe("md5Hash",null,!0)),e.push(new Oe("cacheControl",null,!0)),e.push(new Oe("contentDisposition",null,!0)),e.push(new Oe("contentEncoding",null,!0)),e.push(new Oe("contentLanguage",null,!0)),e.push(new Oe("contentType",null,!0)),e.push(new Oe("metadata","customMetadata",!0)),xe=e,xe}function Ce(e,t){function r(){var r=e["bucket"],n=e["fullPath"],o=new $(r,n);return t._makeStorageReference(o)}Object.defineProperty(e,"ref",{get:r})}function Se(e,t,r){for(var n={type:"file"},o=r.length,i=0;i<o;i++){var a=r[i];n[a.local]=a.xform(n,t[a.server])}return Ce(n,e),n}function Ee(e,t,r){var n=ye(t);if(null===n)return null;var o=n;return Se(e,o,r)}function Ae(e,t,r){var n=ye(t);if(null===n)return null;if(!ne(n["downloadTokens"]))return null;var o=n["downloadTokens"];if(0===o.length)return null;var i=encodeURIComponent,a=o.split(","),s=a.map((function(t){var n=e["bucket"],o=e["fullPath"],a="/b/"+i(n)+"/o/"+i(o),s=se(a,r),u=ue({alt:"media",token:t});return s+u}));return s[0]}function Ie(e,t){for(var r={},n=t.length,o=0;o<n;o++){var i=t[o];i.writable&&(r[i.server]=e[i.local])}return JSON.stringify(r)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var je="prefixes",qe="items";function Me(e,t,r){var n={prefixes:[],items:[],nextPageToken:r["nextPageToken"]};if(r[je])for(var o=0,i=r[je];o<i.length;o++){var a=i[o],s=a.replace(/\/$/,""),u=e._makeStorageReference(new $(t,s));n.prefixes.push(u)}if(r[qe])for(var c=0,l=r[qe];c<l.length;c++){var h=l[c];u=e._makeStorageReference(new $(t,h["name"]));n.items.push(u)}return n}function Le(e,t,r){var n=ye(r);if(null===n)return null;var o=n;return Me(e,t,o)}var Be=function(){function e(e,t,r,n){this.url=e,this.method=t,this.handler=r,this.timeout=n,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}return e}();
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ne(e){if(!e)throw p()}function Fe(e,t){function r(r,n){var o=Ee(e,n,t);return Ne(null!==o),o}return r}function ze(e,t){function r(r,n){var o=Le(e,t,n);return Ne(null!==o),o}return r}function De(e,t){function r(r,n){var o=Ee(e,n,t);return Ne(null!==o),Ae(o,n,e.host)}return r}function He(e){function t(t,r){var n;return n=401===t.getStatus()?t.getResponseText().includes("Firebase App Check token is invalid")?v():g():402===t.getStatus()?_(e.bucket):403===t.getStatus()?b(e.path):r,n.serverResponse=r.serverResponse,n}return t}function Ge(e){var t=He(e);function r(r,n){var o=t(r,n);return 404===r.getStatus()&&(o=d(e.path)),o.serverResponse=n.serverResponse,o}return r}function We(e,t,r){var n=t.fullServerUrl(),o=se(n,e.host),i="GET",a=e.maxOperationRetryTime,s=new Be(o,i,Fe(e,r),a);return s.errorHandler=Ge(t),s}function Xe(e,t,r,n,o){var i={};t.isRoot?i["prefix"]="":i["prefix"]=t.path+"/",r&&r.length>0&&(i["delimiter"]=r),n&&(i["pageToken"]=n),o&&(i["maxResults"]=o);var a=t.bucketOnlyServerUrl(),s=se(a,e.host),u="GET",c=e.maxOperationRetryTime,l=new Be(s,u,ze(e,t.bucket),c);return l.urlParams=i,l.errorHandler=He(t),l}function Ve(e,t,r){var n=t.fullServerUrl(),o=se(n,e.host),i="GET",a=e.maxOperationRetryTime,s=new Be(o,i,De(e,r),a);return s.errorHandler=Ge(t),s}function Ke(e,t,r,n){var o=t.fullServerUrl(),i=se(o,e.host),a="PATCH",s=Ie(r,n),u={"Content-Type":"application/json; charset=utf-8"},c=e.maxOperationRetryTime,l=new Be(i,a,Fe(e,n),c);return l.headers=u,l.body=s,l.errorHandler=Ge(t),l}function Ze(e,t){var r=t.fullServerUrl(),n=se(r,e.host),o="DELETE",i=e.maxOperationRetryTime;function a(e,t){}var s=new Be(n,o,a,i);return s.successCodes=[200,204],s.errorHandler=Ge(t),s}function $e(e,t){return e&&e["contentType"]||t&&t.type()||"application/octet-stream"}function Je(e,t,r){var n=Object.assign({},r);return n["fullPath"]=e.path,n["size"]=t.size(),n["contentType"]||(n["contentType"]=$e(null,t)),n}function Ye(e,t,r,n,o){var i=t.bucketOnlyServerUrl(),a={"X-Goog-Upload-Protocol":"multipart"};function s(){for(var e="",t=0;t<2;t++)e+=Math.random().toString().slice(2);return e}var u=s();a["Content-Type"]="multipart/related; boundary="+u;var c=Je(t,n,o),l=Ie(c,r),h="--"+u+"\r\nContent-Type: application/json; charset=utf-8\r\n\r\n"+l+"\r\n--"+u+"\r\nContent-Type: "+c["contentType"]+"\r\n\r\n",f="\r\n--"+u+"--",p=me.getBlob(h,n,f);if(null===p)throw T();var d={name:c["fullPath"]},_=se(i,e.host),g="POST",v=e.maxUploadRetryTime,b=new Be(_,g,Fe(e,r),v);return b.urlParams=d,b.headers=a,b.body=p.uploadData(),b.errorHandler=He(t),b}var Qe=function(){function e(e,t,r,n){this.current=e,this.total=t,this.finalized=!!r,this.metadata=n||null}return e}();function et(e,t){var r=null;try{r=e.getResponseHeader("X-Goog-Upload-Status")}catch(o){Ne(!1)}var n=t||["active"];return Ne(!!r&&-1!==n.indexOf(r)),r}function tt(e,t,r,n,o){var i=t.bucketOnlyServerUrl(),a=Je(t,n,o),s={name:a["fullPath"]},u=se(i,e.host),c="POST",l={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":""+n.size(),"X-Goog-Upload-Header-Content-Type":a["contentType"],"Content-Type":"application/json; charset=utf-8"},h=Ie(a,r),f=e.maxUploadRetryTime;function p(e){var t;et(e);try{t=e.getResponseHeader("X-Goog-Upload-URL")}catch(r){Ne(!1)}return Ne(ne(t)),t}var d=new Be(u,c,p,f);return d.urlParams=s,d.headers=l,d.body=h,d.errorHandler=He(t),d}function rt(e,t,r,n){var o={"X-Goog-Upload-Command":"query"};function i(e){var t=et(e,["active","final"]),r=null;try{r=e.getResponseHeader("X-Goog-Upload-Size-Received")}catch(i){Ne(!1)}r||Ne(!1);var o=Number(r);return Ne(!isNaN(o)),new Qe(o,n.size(),"final"===t)}var a="POST",s=e.maxUploadRetryTime,u=new Be(r,a,i,s);return u.headers=o,u.errorHandler=He(t),u}var nt=262144;function ot(e,t,r,n,o,i,a,s){var u=new Qe(0,0);if(a?(u.current=a.current,u.total=a.total):(u.current=0,u.total=n.size()),n.size()!==u.total)throw O();var c=u.total-u.current,l=c;o>0&&(l=Math.min(l,o));var h=u.current,f=h+l,p=l===c?"upload, finalize":"upload",d={"X-Goog-Upload-Command":p,"X-Goog-Upload-Offset":""+u.current},_=n.slice(h,f);if(null===_)throw T();function g(e,r){var o,a=et(e,["active","final"]),s=u.current+l,c=n.size();return o="final"===a?Fe(t,i)(e,r):null,new Qe(s,c,"final"===a,o)}var v="POST",b=t.maxUploadRetryTime,m=new Be(r,v,g,b);return m.headers=d,m.body=_.uploadData(),m.progressCallback=s||null,m.errorHandler=He(e),m}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var it=function(){function e(e,t,r){var n=te(e)||null!=t||null!=r;if(n)this.next=e,this.error=t,this.complete=r;else{var o=e;this.next=o.next,this.error=o.error,this.complete=o.complete}}return e}();
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function at(e){return function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];Promise.resolve().then((function(){return e.apply(void 0,t)}))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var st=function(){function e(e,t,r){var n=this;void 0===r&&(r=null),this._transferred=0,this._needToFetchStatus=!1,this._needToFetchMetadata=!1,this._observers=[],this._error=void 0,this._uploadUrl=void 0,this._request=void 0,this._chunkMultiplier=1,this._resolve=void 0,this._reject=void 0,this._ref=e,this._blob=t,this._metadata=r,this._mappings=Ue(),this._resumable=this._shouldDoResumable(this._blob),this._state="running",this._errorHandler=function(e){n._request=void 0,n._chunkMultiplier=1,e._codeEquals("canceled")?(n._needToFetchStatus=!0,n.completeTransitions_()):(n._error=e,n._transition("error"))},this._metadataErrorHandler=function(e){n._request=void 0,e._codeEquals("canceled")?n.completeTransitions_():(n._error=e,n._transition("error"))},this._promise=new Promise((function(e,t){n._resolve=e,n._reject=t,n._start()})),this._promise.then(null,(function(){}))}return e.prototype._makeProgressCallback=function(){var e=this,t=this._transferred;return function(r){return e._updateProgress(t+r)}},e.prototype._shouldDoResumable=function(e){return e.size()>262144},e.prototype._start=function(){"running"===this._state&&void 0===this._request&&(this._resumable?void 0===this._uploadUrl?this._createResumable():this._needToFetchStatus?this._fetchStatus():this._needToFetchMetadata?this._fetchMetadata():this._continueUpload():this._oneShotUpload())},e.prototype._resolveToken=function(e){var t=this;Promise.all([this._ref.storage._getAuthToken(),this._ref.storage._getAppCheckToken()]).then((function(r){var n=r[0],o=r[1];switch(t._state){case"running":e(n,o);break;case"canceling":t._transition("canceled");break;case"pausing":t._transition("paused");break}}))},e.prototype._createResumable=function(){var e=this;this._resolveToken((function(t,r){var n=tt(e._ref.storage,e._ref._location,e._mappings,e._blob,e._metadata),o=e._ref.storage._makeRequest(n,t,r);e._request=o,o.getPromise().then((function(t){e._request=void 0,e._uploadUrl=t,e._needToFetchStatus=!1,e.completeTransitions_()}),e._errorHandler)}))},e.prototype._fetchStatus=function(){var e=this,t=this._uploadUrl;this._resolveToken((function(r,n){var o=rt(e._ref.storage,e._ref._location,t,e._blob),i=e._ref.storage._makeRequest(o,r,n);e._request=i,i.getPromise().then((function(t){e._request=void 0,e._updateProgress(t.current),e._needToFetchStatus=!1,t.finalized&&(e._needToFetchMetadata=!0),e.completeTransitions_()}),e._errorHandler)}))},e.prototype._continueUpload=function(){var e=this,t=nt*this._chunkMultiplier,r=new Qe(this._transferred,this._blob.size()),n=this._uploadUrl;this._resolveToken((function(o,i){var a;try{a=ot(e._ref._location,e._ref.storage,n,e._blob,t,e._mappings,r,e._makeProgressCallback())}catch(u){return e._error=u,void e._transition("error")}var s=e._ref.storage._makeRequest(a,o,i);e._request=s,s.getPromise().then((function(t){e._increaseMultiplier(),e._request=void 0,e._updateProgress(t.current),t.finalized?(e._metadata=t.metadata,e._transition("success")):e.completeTransitions_()}),e._errorHandler)}))},e.prototype._increaseMultiplier=function(){var e=nt*this._chunkMultiplier;e<33554432&&(this._chunkMultiplier*=2)},e.prototype._fetchMetadata=function(){var e=this;this._resolveToken((function(t,r){var n=We(e._ref.storage,e._ref._location,e._mappings),o=e._ref.storage._makeRequest(n,t,r);e._request=o,o.getPromise().then((function(t){e._request=void 0,e._metadata=t,e._transition("success")}),e._metadataErrorHandler)}))},e.prototype._oneShotUpload=function(){var e=this;this._resolveToken((function(t,r){var n=Ye(e._ref.storage,e._ref._location,e._mappings,e._blob,e._metadata),o=e._ref.storage._makeRequest(n,t,r);e._request=o,o.getPromise().then((function(t){e._request=void 0,e._metadata=t,e._updateProgress(e._blob.size()),e._transition("success")}),e._errorHandler)}))},e.prototype._updateProgress=function(e){var t=this._transferred;this._transferred=e,this._transferred!==t&&this._notifyObservers()},e.prototype._transition=function(e){if(this._state!==e)switch(e){case"canceling":this._state=e,void 0!==this._request&&this._request.cancel();break;case"pausing":this._state=e,void 0!==this._request&&this._request.cancel();break;case"running":var t="paused"===this._state;this._state=e,t&&(this._notifyObservers(),this._start());break;case"paused":this._state=e,this._notifyObservers();break;case"canceled":this._error=y(),this._state=e,this._notifyObservers();break;case"error":this._state=e,this._notifyObservers();break;case"success":this._state=e,this._notifyObservers();break}},e.prototype.completeTransitions_=function(){switch(this._state){case"pausing":this._transition("paused");break;case"canceling":this._transition("canceled");break;case"running":this._start();break}},Object.defineProperty(e.prototype,"snapshot",{get:function(){var e=X(this._state);return{bytesTransferred:this._transferred,totalBytes:this._blob.size(),state:e,metadata:this._metadata,task:this,ref:this._ref}},enumerable:!1,configurable:!0}),e.prototype.on=function(e,t,r,n){var o=this,i=new it(t,r,n);return this._addObserver(i),function(){o._removeObserver(i)}},e.prototype.then=function(e,t){return this._promise.then(e,t)},e.prototype.catch=function(e){return this.then(null,e)},e.prototype._addObserver=function(e){this._observers.push(e),this._notifyObserver(e)},e.prototype._removeObserver=function(e){var t=this._observers.indexOf(e);-1!==t&&this._observers.splice(t,1)},e.prototype._notifyObservers=function(){var e=this;this._finishPromise();var t=this._observers.slice();t.forEach((function(t){e._notifyObserver(t)}))},e.prototype._finishPromise=function(){if(void 0!==this._resolve){var e=!0;switch(X(this._state)){case W.SUCCESS:at(this._resolve.bind(null,this.snapshot))();break;case W.CANCELED:case W.ERROR:var t=this._reject;at(t.bind(null,this._error))();break;default:e=!1;break}e&&(this._resolve=void 0,this._reject=void 0)}},e.prototype._notifyObserver=function(e){var t=X(this._state);switch(t){case W.RUNNING:case W.PAUSED:e.next&&at(e.next.bind(e,this.snapshot))();break;case W.SUCCESS:e.complete&&at(e.complete.bind(e))();break;case W.CANCELED:case W.ERROR:e.error&&at(e.error.bind(e,this._error))();break;default:e.error&&at(e.error.bind(e,this._error))()}},e.prototype.resume=function(){var e="paused"===this._state||"pausing"===this._state;return e&&this._transition("running"),e},e.prototype.pause=function(){var e="running"===this._state;return e&&this._transition("pausing"),e},e.prototype.cancel=function(){var e="running"===this._state||"pausing"===this._state;return e&&this._transition("canceling"),e},e}(),ut=function(){function e(e,t){this._service=e,this._location=t instanceof $?t:$.makeFromUrl(t,e.host)}return e.prototype.toString=function(){return"gs://"+this._location.bucket+"/"+this._location.path},e.prototype._newRef=function(t,r){return new e(t,r)},Object.defineProperty(e.prototype,"root",{get:function(){var e=new $(this._location.bucket,"");return this._newRef(this._service,e)},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"bucket",{get:function(){return this._location.bucket},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"fullPath",{get:function(){return this._location.path},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"name",{get:function(){return ke(this._location.path)},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"storage",{get:function(){return this._service},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"parent",{get:function(){var t=we(this._location.path);if(null===t)return null;var r=new $(this._location.bucket,t);return new e(this._service,r)},enumerable:!1,configurable:!0}),e.prototype._throwIfRoot=function(e){if(""===this._location.path)throw C(e)},e}();
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ct(e,t,r){return e._throwIfRoot("uploadBytesResumable"),new st(e,new me(t),r)}function lt(e){var t={prefixes:[],items:[]};return ht(e,t).then((function(){return t}))}function ht(e,t,r){return(0,o.__awaiter)(this,void 0,void 0,(function(){var n,i,a,s;return(0,o.__generator)(this,(function(o){switch(o.label){case 0:return n={pageToken:r},[4,ft(e,n)];case 1:return i=o.sent(),(a=t.prefixes).push.apply(a,i.prefixes),(s=t.items).push.apply(s,i.items),null==i.nextPageToken?[3,3]:[4,ht(e,t,i.nextPageToken)];case 2:o.sent(),o.label=3;case 3:return[2]}}))}))}function ft(e,t){return(0,o.__awaiter)(this,void 0,void 0,(function(){var r,n;return(0,o.__generator)(this,(function(o){switch(o.label){case 0:return null!=t&&"number"===typeof t.maxResults&&ae("options.maxResults",1,1e3,t.maxResults),r=t||{},n=Xe(e.storage,e._location,"/",r.pageToken,r.maxResults),[4,e.storage.makeRequestWithTokens(n)];case 1:return[2,o.sent().getPromise()]}}))}))}function pt(e){return(0,o.__awaiter)(this,void 0,void 0,(function(){var t;return(0,o.__generator)(this,(function(r){switch(r.label){case 0:return e._throwIfRoot("getMetadata"),t=We(e.storage,e._location,Ue()),[4,e.storage.makeRequestWithTokens(t)];case 1:return[2,r.sent().getPromise()]}}))}))}function dt(e,t){return(0,o.__awaiter)(this,void 0,void 0,(function(){var r;return(0,o.__generator)(this,(function(n){switch(n.label){case 0:return e._throwIfRoot("updateMetadata"),r=Ke(e.storage,e._location,t,Ue()),[4,e.storage.makeRequestWithTokens(r)];case 1:return[2,n.sent().getPromise()]}}))}))}function _t(e){return(0,o.__awaiter)(this,void 0,void 0,(function(){var t;return(0,o.__generator)(this,(function(r){switch(r.label){case 0:return e._throwIfRoot("getDownloadURL"),t=Ve(e.storage,e._location,Ue()),[4,e.storage.makeRequestWithTokens(t)];case 1:return[2,r.sent().getPromise().then((function(e){if(null===e)throw x();return e}))]}}))}))}function gt(e){return(0,o.__awaiter)(this,void 0,void 0,(function(){var t;return(0,o.__generator)(this,(function(r){switch(r.label){case 0:return e._throwIfRoot("deleteObject"),t=Ze(e.storage,e._location),[4,e.storage.makeRequestWithTokens(t)];case 1:return[2,r.sent().getPromise()]}}))}))}function vt(e,t){var r=Re(e._location.path,t),n=new $(e._location.bucket,r);return new ut(e.storage,n)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bt(e){return/^[A-Za-z]+:\/\//.test(e)}function mt(e,t){return new ut(e,t)}function yt(e,t){if(e instanceof Tt){var r=e;if(null==r._bucket)throw k();var n=new ut(r,r._bucket);return null!=t?yt(n,t):n}return void 0!==t?vt(e,t):e}function wt(e,t){if(t&&bt(t)){if(e instanceof Tt)return mt(e,t);throw P("To use ref(service, url), the first argument must be a Storage instance.")}return yt(e,t)}function Rt(e,t){var r=null===t||void 0===t?void 0:t[u];return null==r?null:$.makeFromBucketSpec(r,e)}function kt(e,t,r,n){void 0===n&&(n={}),e.host="http://"+t+":"+r;var o=n.mockUserToken;o&&(e._overrideAuthToken="string"===typeof o?o:(0,i.createMockUserToken)(o,e.app.options.projectId))}var Tt=function(){function e(e,t,r,n,o,i){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._pool=n,this._url=o,this._firebaseVersion=i,this._bucket=null,this._host=s,this._appId=null,this._deleted=!1,this._maxOperationRetryTime=c,this._maxUploadRetryTime=l,this._requests=new Set,this._bucket=null!=o?$.makeFromBucketSpec(o,this._host):Rt(this._host,this.app.options)}return Object.defineProperty(e.prototype,"host",{get:function(){return this._host},set:function(e){this._host=e,null!=this._url?this._bucket=$.makeFromBucketSpec(this._url,e):this._bucket=Rt(e,this.app.options)},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"maxUploadRetryTime",{get:function(){return this._maxUploadRetryTime},set:function(e){ae("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"maxOperationRetryTime",{get:function(){return this._maxOperationRetryTime},set:function(e){ae("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e},enumerable:!1,configurable:!0}),e.prototype._getAuthToken=function(){return(0,o.__awaiter)(this,void 0,void 0,(function(){var e,t;return(0,o.__generator)(this,(function(r){switch(r.label){case 0:return this._overrideAuthToken?[2,this._overrideAuthToken]:(e=this._authProvider.getImmediate({optional:!0}),e?[4,e.getToken()]:[3,2]);case 1:if(t=r.sent(),null!==t)return[2,t.accessToken];r.label=2;case 2:return[2,null]}}))}))},e.prototype._getAppCheckToken=function(){return(0,o.__awaiter)(this,void 0,void 0,(function(){var e,t;return(0,o.__generator)(this,(function(r){switch(r.label){case 0:return e=this._appCheckProvider.getImmediate({optional:!0}),e?[4,e.getToken()]:[3,2];case 1:return t=r.sent(),[2,t.token];case 2:return[2,null]}}))}))},e.prototype._delete=function(){return this._deleted||(this._deleted=!0,this._requests.forEach((function(e){return e.cancel()})),this._requests.clear()),Promise.resolve()},e.prototype._makeStorageReference=function(e){return new ut(this,e)},e.prototype._makeRequest=function(e,t,r){var n=this;if(this._deleted)return new J(U());var o=_e(e,this._appId,t,r,this._pool,this._firebaseVersion);return this._requests.add(o),o.getPromise().then((function(){return n._requests.delete(o)}),(function(){return n._requests.delete(o)})),o},e.prototype.makeRequestWithTokens=function(e){return(0,o.__awaiter)(this,void 0,void 0,(function(){var t,r,n;return(0,o.__generator)(this,(function(o){switch(o.label){case 0:return[4,Promise.all([this._getAuthToken(),this._getAppCheckToken()])];case 1:return t=o.sent(),r=t[0],n=t[1],[2,this._makeRequest(e,r,n)]}}))}))},e}();
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ot(e,t,r){return e=(0,i.getModularInstance)(e),ct(e,t,r)}function xt(e){return e=(0,i.getModularInstance)(e),pt(e)}function Pt(e,t){return e=(0,i.getModularInstance)(e),dt(e,t)}function Ut(e,t){return e=(0,i.getModularInstance)(e),ft(e,t)}function Ct(e){return e=(0,i.getModularInstance)(e),lt(e)}function St(e){return e=(0,i.getModularInstance)(e),_t(e)}function Et(e){return e=(0,i.getModularInstance)(e),gt(e)}function At(e,t){return e=(0,i.getModularInstance)(e),wt(e,t)}function It(e,t){return vt(e,t)}function jt(e,t,r,n){void 0===n&&(n={}),kt(e,t,r,n)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var qt=function(){function e(e,t,r){this._delegate=e,this.task=t,this.ref=r}return Object.defineProperty(e.prototype,"bytesTransferred",{get:function(){return this._delegate.bytesTransferred},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"metadata",{get:function(){return this._delegate.metadata},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"state",{get:function(){return this._delegate.state},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"totalBytes",{get:function(){return this._delegate.totalBytes},enumerable:!1,configurable:!0}),e}(),Mt=function(){function e(e,t){this._delegate=e,this._ref=t,this.cancel=this._delegate.cancel.bind(this._delegate),this.catch=this._delegate.catch.bind(this._delegate),this.pause=this._delegate.pause.bind(this._delegate),this.resume=this._delegate.resume.bind(this._delegate)}return Object.defineProperty(e.prototype,"snapshot",{get:function(){return new qt(this._delegate.snapshot,this,this._ref)},enumerable:!1,configurable:!0}),e.prototype.then=function(e,t){var r=this;return this._delegate.then((function(t){if(e)return e(new qt(t,r,r._ref))}),t)},e.prototype.on=function(e,t,r,n){var o=this,i=void 0;return t&&(i="function"===typeof t?function(e){return t(new qt(e,o,o._ref))}:{next:t.next?function(e){return t.next(new qt(e,o,o._ref))}:void 0,complete:t.complete||void 0,error:t.error||void 0}),this._delegate.on(e,i,r||void 0,n||void 0)},e}(),Lt=function(){function e(e,t){this._delegate=e,this._service=t}return Object.defineProperty(e.prototype,"prefixes",{get:function(){var e=this;return this._delegate.prefixes.map((function(t){return new Bt(t,e._service)}))},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"items",{get:function(){var e=this;return this._delegate.items.map((function(t){return new Bt(t,e._service)}))},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"nextPageToken",{get:function(){return this._delegate.nextPageToken||null},enumerable:!1,configurable:!0}),e}(),Bt=function(){function e(e,t){this._delegate=e,this.storage=t}return Object.defineProperty(e.prototype,"name",{get:function(){return this._delegate.name},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"bucket",{get:function(){return this._delegate.bucket},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"fullPath",{get:function(){return this._delegate.fullPath},enumerable:!1,configurable:!0}),e.prototype.toString=function(){return this._delegate.toString()},e.prototype.child=function(t){var r=It(this._delegate,t);return new e(r,this.storage)},Object.defineProperty(e.prototype,"root",{get:function(){return new e(this._delegate.root,this.storage)},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"parent",{get:function(){var t=this._delegate.parent;return null==t?null:new e(t,this.storage)},enumerable:!1,configurable:!0}),e.prototype.put=function(e,t){return this._throwIfRoot("put"),new Mt(Ot(this._delegate,e,t),this)},e.prototype.putString=function(e,t,r){void 0===t&&(t=I.RAW),this._throwIfRoot("putString");var n=q(t,e),i=(0,o.__assign)({},r);return null==i["contentType"]&&null!=n.contentType&&(i["contentType"]=n.contentType),new Mt(new st(this._delegate,new me(n.data,!0),i),this)},e.prototype.listAll=function(){var e=this;return Ct(this._delegate).then((function(t){return new Lt(t,e.storage)}))},e.prototype.list=function(e){var t=this;return Ut(this._delegate,e||void 0).then((function(e){return new Lt(e,t.storage)}))},e.prototype.getMetadata=function(){return xt(this._delegate)},e.prototype.updateMetadata=function(e){return Pt(this._delegate,e)},e.prototype.getDownloadURL=function(){return St(this._delegate)},e.prototype.delete=function(){return this._throwIfRoot("delete"),Et(this._delegate)},e.prototype._throwIfRoot=function(e){if(""===this._delegate._location.path)throw C(e)},e}(),Nt=function(){function e(e,t){this.app=e,this._delegate=t}return Object.defineProperty(e.prototype,"maxOperationRetryTime",{get:function(){return this._delegate.maxOperationRetryTime},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"maxUploadRetryTime",{get:function(){return this._delegate.maxUploadRetryTime},enumerable:!1,configurable:!0}),e.prototype.ref=function(e){if(bt(e))throw P("ref() expected a child path but got a URL, use refFromURL instead.");return new Bt(At(this._delegate,e),this)},e.prototype.refFromURL=function(e){if(!bt(e))throw P("refFromURL() expected a full URL but got a child path, use ref() instead.");try{$.makeFromUrl(e,this._delegate.host)}catch(t){throw P("refFromUrl() expected a valid full URL but got an invalid one.")}return new Bt(At(this._delegate,e),this)},e.prototype.setMaxUploadRetryTime=function(e){this._delegate.maxUploadRetryTime=e},e.prototype.setMaxOperationRetryTime=function(e){this._delegate.maxOperationRetryTime=e},e.prototype.useEmulator=function(e,t,r){void 0===r&&(r={}),jt(this._delegate,e,t,r)},e}(),Ft="@firebase/storage",zt="0.7.1",Dt="storage";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ht(e,t){var r=t.instanceIdentifier,o=e.getProvider("app").getImmediate(),i=e.getProvider("auth-internal"),a=e.getProvider("app-check-internal"),s=new Nt(o,new Tt(o,i,a,new Z,r,n["default"].SDK_VERSION));return s}function Gt(e){var t={TaskState:W,TaskEvent:G,StringFormat:I,Storage:Tt,Reference:Bt};e.INTERNAL.registerComponent(new a.Component(Dt,Ht,"PUBLIC").setServiceProps(t).setMultipleInstances(!0)),e.registerVersion(Ft,zt)}Gt(n["default"])}}]);
//# sourceMappingURL=111.45f12424.js.map