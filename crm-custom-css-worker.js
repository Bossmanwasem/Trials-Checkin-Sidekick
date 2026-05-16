// crm-custom-css-worker.js

(() => {
  const CRM_CUSTOM_CSS_ENABLED_STORAGE_KEY = "ttmtCrmSmartboxBlueThemeEnabled";
  const CRM_CUSTOM_CSS_STYLE_ID = "ttmt-crm-smartbox-blue-theme-style";
  const CRM_CUSTOM_CSS = `
/* Import Google Fonts */
@import url("//fonts.googleapis.com/css2?family=Quicksand:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap");

/* Aspnet form */
#aspnetForm{
 background-color:#1e1e2f;
}

/* Footertxt */
.pageContent tr .footertxt{
 transform:translatex(0px) translatey(0px);
 background-color:#1e1e2f;
 color:#ffffff;
 font-family:'Quicksand', sans-serif;
}

/* Table Data */
.pageContent > table > tbody > tr > td > table > tbody > tr > td{
 background-color:#1e1e2f;
 color:#ffffff;
 transform:translatex(0px) translatey(0px);
}

/* Label */
#Content div label{
 color:#ffffff;
}

/* Heading */
#Content h1{
 color:#4ca5e0;
}

/* Image */
.pageContent tr img{
 transform:scale(1.26);
 filter: brightness(0.4) invert(1) hue-rotate(215deg) saturate(10);
}

/* Table Data */
.pageContent > table > tbody > tr > td{
 background-color:#1e1e2f;
}

/* Input */
#Content div input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#23cfff;
}

/* Input */
#Content div input[type=password]{
 background-color:#1e1e2f;
 border-color:#1eceff;
 color:#ffffff;
}

/* Paragraph */
#Content div p{
 color:#ffffff;
}

/* Page content */
#aspnetForm .pageContent{
 background-color:#1e1e2f;
 color:#ffffff;
}

/* Table Data */
.pageContent > table > tbody > tr > td{
 background-color:#1e1e2f !important;
 transform:translatex(0px) translatey(0px);
}

/* Division */
#ctl00_MainContent_FormView1_lblBody div:nth-child(4){
 letter-spacing:0.7px;
 color:#ffffff;
 display:block;
 background-color:#1e1e2f;
}

/* Division */
#ctl00_MainContent_FormView1_lblBody div:nth-child(8){
 background-color:#1e1e2f;
 line-height:19px;
}

/* Image */
div > a img{
 filter: brightness(0.35) invert(1) hue-rotate(176deg);
}

/* Link */
td > div > table .ctl00_TreeView1_2 a{
 color:#ffffff;
}

/* Link */
div div table:nth-child(1) tbody tr .ctl00_TreeView1_2:nth-child(3) a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(2) .ctl00_TreeView1_2:nth-child(3) a{
 color:#ffffff;
}

/* Link */
div div table:nth-child(1) tbody tr .ctl00_TreeView1_2:nth-child(4) a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(2) .ctl00_TreeView1_2:nth-child(4) a{
 color:#ffffff;
}

/* Link */
td div div div div:nth-child(3) table:nth-child(1) tbody tr .ctl00_TreeView1_2 a{
 color:#ffffff;
}

/* Link */
td div div div div:nth-child(3) table:nth-child(2) tbody tr .ctl00_TreeView1_2 a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(4) .ctl00_TreeView1_2:nth-child(4) a{
 color:#ffffff;
}

/* Link */
#aspnetForm div:nth-child(5) table:nth-child(1) a{
 color:#ffffff;
}

/* Link */
#aspnetForm div:nth-child(5) table:nth-child(2) a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(3) a{
 color:#ffffff;
}

/* Link */
td div div div div table:nth-child(4) tbody tr .ctl00_TreeView1_2 a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(5) a{
 color:#ffffff;
}

/* Link */
td div div div div table:nth-child(6) tbody tr .ctl00_TreeView1_2 a{
 color:#ffffff;
}

/* Link */
#aspnetForm table:nth-child(6) .ctl00_TreeView1_2:nth-child(4) a{
 color:#ffffff;
}

/* Heading */
#ContentAdmin h1{
 color:#ffffff;
}

/* Span Tag */
#ctl00_MainContent_FormView1_lblBody > div > span{
 background-color:#1e1e2f !important;
}

/* Underline text tag */
#ctl00_MainContent_FormView1_lblBody div > span > u{
 background-color:#1e1e2f !important;
}

/* Span Tag */
#ctl00_MainContent_FormView1_lblBody div > span span{
 background-color:#1e1e2f;
}

/* Font */
#ctl00_MainContent_FormView1_lblBody > div > font{
 background-color:#1e1e2f;
 color:#ffffff !important;
}

/* Span Tag */
#ctl00_MainContent_FormView1_lblBody div font > span{
 background-color:#1e1e2f !important;
}

/* Division */
#ctl00_MainContent_FormView1_lblBody div font > div{
 background-color:#1e1e2f;
}

/* Strong Tag */
#ctl00_MainContent_FormView1_lblBody > div > strong{
 background-color:#1e1e2f !important;
}

/* Login name */
.pageContent tr .loginName{
 color:#ffffff;
}

/* Link */
.pageContent .loginName a{
 color:#38afff;
}

/* Underline text tag */
#ctl00_MainContent_FormView1_lblBody div > u{
 background-color:#1e1e2f !important;
}

/* Image */
td div div div div table tbody tr td img{
 filter: invert(1);
}

/* Content admin */
#ContentAdmin{
 background-color:#1e1e2f;
 transform:translatex(0px) translatey(0px);
}

/* Heading */
#ctl00_MainContent_FormView1_lblBody h3{
 background-color:#1e1e2f;
}


/* Ajax tab body */
#ContentAdmin div div .ajax__tab_body{
 background-color:#1e1e2f;
 border-color:#42c5fa;
 border-width:2px;
 color:#ffffff;
}

/* Ajax tab body */
#ContentAdmin > div > .ajax__tab_body{
 background-color:#1e1e2f;
 border-width:2px;
 border-color:#42c5fa;
 color:#ffffff;
 transform:translatex(0px) translatey(0px);
}

/* Div alphabet */
#divAlphabet{
 border-top-left-radius:25px;
 border-top-right-radius:25px;
 border-bottom-left-radius:25px;
 border-bottom-right-radius:25px;
 background-color:#42c5fa;
}

/* Card body */
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-body{
 background-color:#1e1e2f;
 color:#ffffff;
 border-width:2px;
}

/* Card header */
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-header{
 background-color:#42c5fa;
 border-width:0px;
}

/* Input */
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-body .row .col-md-9 input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Select */
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-body .row .col-md-9 select{
 background-color:#1e1e2f !important;
 color:#ffffff;
 border-color:#42c5fa !important;
}

/* Text Area */
.card .card-body .row .col-md-9 textarea{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Input */
.card .card-body .row .col-md-10 input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Select */
.col-md-6 .card .card-body .row .col-md-10 select{
 color:#ffffff;
}

/* Select */
#ContentAdmin div .ajax__tab_body .ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-body .row .col-md-10 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Input */
.col-md-6 .card .card-body .row .col-md-6 input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Text Area */
.col-md-6 .card .card-body .row .col-md-6 textarea{
 color:#ffffff;
 background-color:#1e1e2f;
 border-color:#42c5fa;
}

/* Input */
.col-md-4 .row .col-7 .d-flex input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Input */
.col-md-4 .row .col-md-7 .d-flex input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Column 6/12 */
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid > .row > .col-md-6{
 background-color:#1e1e2f;
}

/* Ajax tab tab */
#ContentAdmin .ajax__tab_body .ajax__tab_tab{
 background-color:transparent;
}

/* Ajax tab inner */
#ContentAdmin .ajax__tab_body .ajax__tab_inner{
 background-color:transparent;
}

/* Card header */
#ContentAdmin > div > .ajax__tab_body > .ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-header{
 background-color:#42c5fa;
}

/* Card header */
.col-md-6 .card .card-body .card .card-header{
 background-color:#42c5fa;
}

/* Card body */
#ContentAdmin > div > .ajax__tab_body > .ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-body{
 background-color:#1e1e2f;
 color:#ffffff;
 transform:translatex(0px) translatey(0px);
}

/* Table Data */
.col-md-6 .card .card-body div div .table-striped tbody tr td{
 background-color:#1e1e2f;
 color:#ffffff;
}

/* Th */
.col-md-6 .card .card-body div div .table-striped tbody tr th{
 background-color:#42c5fa;
}

/* Card body */
.col-md-6 .card .card-body div .card .card-body{
 background-color:#1e1e2f;
 color:#ffffff;
 transform:translatex(0px) translatey(0px);
}

/* Select */
#ContentAdmin div .ajax__tab_body .ajax__tab_panel div .container-fluid .row .col-md-6 .card .card-body div .card .card-body .row .col-md-9 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.card-body div .card .card-body .row .col-md-9 select{
 color:#ffffff;
}

/* Card body */
.col-md-6 .card .card-body .card .card-body{
 background-color:#1e1e2f;
}

/* Text Area */
#ContentAdmin .card .card textarea{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Column 3/12 */
.col-md-6 .card .card-body .card .card-body .row .col-md-3{
 color:#ffffff;
}

/* Select */
#ContentAdmin div .ajax__tab_body .ajax__tab_panel div .container-fluid .row .col-md-6 .card .card-body .row .col-md-8 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.card .card-body .row .col-md-8 select{
 color:#ffffff;
}

/* Input */
.ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-body > .row .col-md-8 .d-flex input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Input */
#ContentAdmin .vocabfile-search input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Column 9/12 */
.col-md-6 .card .card-body .card .card-body .row .col-md-9{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Select */
#ContentAdmin div .ajax__tab_body .ajax__tab_panel div .container-fluid .row .col-md-6 .card .card-body .card .card-body .row .col-md-9 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.card-body .card .card-body .row .col-md-9 select{
 color:#ffffff;
}

/* Input */
.card-body .card .card-body .row .col-md-9 .d-flex input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Text Area */
.card .card-body .row .col-md-8 textarea{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Input */
.ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-body > .row .col-md-8 input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Card body */
.ajax__tab_panel > div > .card .card-body{
 background-color:#1e1e2f;
 color:#ffffff;
 transform:translatex(0px) translatey(0px);
}

/* Form label */
.ajax__tab_panel > div > .card .col-md-3 .form-label{
 color:#ffffff;
}

/* Card header */
.ajax__tab_panel > div > .card .card-header{
 background-color:#42c5fa;
 border-color:#42c5fa;
}

/* Select */
.pageContent table tbody tr td #ContentAdmin div .ajax__tab_body .ajax__tab_panel div .card .card-body .container-fluid .row .col-md-9 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.card-body .container-fluid .row .col-md-9 select{
 color:#ffffff;
}

/* Th */
.col-12 div .table-striped tbody tr th{
 background-color:#42c5fa;
 border-top-right-radius:0px;
}

/* Table Data */
.ajax__tab_panel > div > .card .col-12 > div .table-striped > tbody > tr > td{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
 border-width:1px;
 border-top-color:#849bb2;
}

/* Text Area */
#ContentAdmin tr textarea{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Select */
.pageContent table tbody tr td #ContentAdmin div .ajax__tab_body .ajax__tab_panel > div > .card .card-body .mb-3 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.ajax__tab_panel > div > .card .mb-3 select{
 color:#ffffff;
}

/* Text Area */
.card-body .container-fluid .row .col-md-10 textarea{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Form label */
.ajax__tab_panel > div > .card .col-md-2 .form-label{
 color:#ffffff;
}

/* Select */
.pageContent table tbody tr td #ContentAdmin div .ajax__tab_body .ajax__tab_panel div .card .card-body .container-fluid .row .col-md-10 select{
 background-color:#1e1e2f !important;
 border-color:#42c5fa !important;
}

/* Select */
.card-body .container-fluid .row .col-md-10 select{
 color:#ffffff;
}

/* Input */
.ajax__tab_panel > div > .card input[type=text]{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa;
}

/* Input */
.timeSelector tr input{
 background-color:#1e1e2f;
 color:#ffffff;
 border-color:#42c5fa !important;
}

/* Ajax tab body */
#ContentAdmin > div > .ajax__tab_body{
 background-color:#1e1e2f;
 transform:translatex(0px) translatey(0px);
}

/* Card header */
.ajax__tab_panel > .card .card-header{
 background-color:#42c5fa;
}

`;

  function getStoredValue(key) {
    return new Promise(resolve => {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(key, res => resolve(res?.[key] ?? null));
        return;
      }
      const raw = localStorage.getItem(key);
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  }

  function setCrmCustomCssEnabled(enabled) {
    const existing = document.getElementById(CRM_CUSTOM_CSS_STYLE_ID);
    if (!enabled) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const style = document.createElement("style");
    style.id = CRM_CUSTOM_CSS_STYLE_ID;
    style.textContent = CRM_CUSTOM_CSS;
    document.head.appendChild(style);
  }

  function initCrmCustomCssWorker() {
    getStoredValue(CRM_CUSTOM_CSS_ENABLED_STORAGE_KEY).then(value => {
      setCrmCustomCssEnabled(Boolean(value));
    });
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (!changes[CRM_CUSTOM_CSS_ENABLED_STORAGE_KEY]) return;
        setCrmCustomCssEnabled(Boolean(changes[CRM_CUSTOM_CSS_ENABLED_STORAGE_KEY].newValue));
      });
    }
  }

  initCrmCustomCssWorker();
})();
