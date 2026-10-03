const CONFIG = {
  SHEET_NAME: 'Orders',
  DRIVE_FOLDER_NAME: 'DD_Print_Jobs',
  MAX_FILE_BYTES: 15 * 1024 * 1024
};

function doGet(e) {
  const action = (e.parameter.action || 'health').toLowerCase();
  if (action === 'health') return json({ok:true, service:'D&D Digital Solutions Print API', time:new Date().toISOString()});
  if (action === 'next') return nextJob();
  if (action === 'orders') return listOrders();
  return json({ok:false,error:'Unknown action'});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').toLowerCase();
    if (action === 'create') return createOrder(body);
    if (action === 'claim') return updateStatus(body.orderId,'Printing');
    if (action === 'complete') return updateStatus(body.orderId,'Completed');
    if (action === 'failed') return updateStatus(body.orderId,'Failed', body.error || '');
    return json({ok:false,error:'Unknown action'});
  } catch(err) {
    return json({ok:false,error:String(err)});
  }
}

function createOrder(b) {
  if (!b.fileName || !b.fileData) throw new Error('File is required');
  const bytes = Utilities.base64Decode(b.fileData);
  if (bytes.length > CONFIG.MAX_FILE_BYTES) throw new Error('File too large. Maximum 15 MB.');
  const folder = getFolder();
  const safeName = String(b.fileName).replace(/[^a-zA-Z0-9._ -]/g,'_');
  const file = folder.createFile(Utilities.newBlob(bytes, b.mimeType || 'application/octet-stream', safeName));
  const id = 'DD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(100+Math.random()*900);
  const sh = getSheet();
  sh.appendRow([id,new Date(),'Pending',safeName,b.customerName||'',b.mobile||'',b.mode||'Black & White',b.paper||'A4',Number(b.copies||1),file.getId(),'',b.price||0]);
  return json({ok:true,orderId:id,status:'Pending'});
}

function nextJob() {
  const sh=getSheet(), values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    if(String(values[i][2])==='Pending'){
      const fileId=values[i][9], f=DriveApp.getFileById(fileId);
      const data=Utilities.base64Encode(f.getBlob().getBytes());
      sh.getRange(i+1,3).setValue('Printing');
      sh.getRange(i+1,11).setValue(new Date());
      return json({ok:true,orderId:values[i][0],fileName:values[i][3],mode:values[i][6],paper:values[i][7],copies:Number(values[i][8]||1),fileData:data,mimeType:f.getMimeType()});
    }
  }
  return json({ok:true,job:null});
}

function updateStatus(id,status,note) {
  const sh=getSheet(), values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++) if(String(values[i][0])===String(id)){
    sh.getRange(i+1,3).setValue(status);
    sh.getRange(i+1,11).setValue(new Date());
    if(note) sh.getRange(i+1,12).setValue(String(note).slice(0,500));
    return json({ok:true,orderId:id,status:status});
  }
  return json({ok:false,error:'Order not found'});
}

function listOrders() {
  const sh=getSheet(), values=sh.getDataRange().getValues();
  return json({ok:true,orders:values.slice(1).map(r=>({orderId:r[0],created:r[1],status:r[2],fileName:r[3],customerName:r[4],mobile:r[5],mode:r[6],paper:r[7],copies:r[8],price:r[11]})).slice(-100).reverse()});
}

function getSheet(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(CONFIG.SHEET_NAME);
  if(!sh){sh=ss.insertSheet(CONFIG.SHEET_NAME);sh.appendRow(['Order ID','Created','Status','File','Customer','Mobile','Mode','Paper','Copies','Drive File ID','Updated','Price']);}
  return sh;
}
function getFolder(){
  const it=DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  return it.hasNext()?it.next():DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
}
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
