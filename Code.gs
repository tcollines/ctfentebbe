// Only one submission is written at a time, so two people saving at the same moment
// can't be given the same empty rows and overwrite each other.
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(60000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Server busy, please try again"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    return handlePost_(e);
  } finally {
    lock.releaseLock();
  }
}

function handlePost_(e) {
  try {
    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);
    var category = data.category; // e.g., "RESIDENTIALS"
    var location = data.location; // e.g., "KATABI"
    var swCategory = getSoulsWonCategory_(category, data.sourceCategory);
    var name = data.name;
    var phone = data.phone;
    var church = data.church || "";
    
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(category);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Sheet not found"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Map special Church roles to exact sheet headers
    if (category === 'CHURCHES') {
      if (location === 'Pastor') location = 'PASTORS - CTF ENTEBBE';
      if (location === 'Member') location = 'MEMBERS- CTF ENTEBBE';
    }
    
    var lastCol = Math.min(Math.max(sheet.getLastColumn(), 50), sheet.getMaxColumns()); // Read far enough right, but not past the sheet's edge
    
    var targetStartCol = -1; // 1-indexed
    var targetRow = 3;
    var outputData = [];
    var peopleArray = data.people || [];
    
    // Fallback for single payload
    if (data.name && data.phone && peopleArray.length === 0) {
      peopleArray.push({name: data.name, phone: data.phone, church: data.church || "", soulsWon: data.soulsWon || false});
    }

    if (category === 'SCHOOLS') {
      targetStartCol = 1;
      var nameColIndex = 2; // Column B: SCHOOL
      var maxDataRow = Math.max(3, sheet.getLastRow());
      var nameColValues = sheet.getRange(3, nameColIndex, maxDataRow - 2, 1).getValues();
      
      for (var r = 0; r < nameColValues.length; r++) {
        if (!nameColValues[r][0] || nameColValues[r][0].toString().trim() === "") {
          targetRow = 3 + r;
          break;
        }
        if (r === nameColValues.length - 1) {
          targetRow = 3 + r + 1;
        }
      }
      
      if (peopleArray.length > 0) {
        for (var i = 0; i < peopleArray.length; i++) {
          var p = peopleArray[i];
          var sn = (targetRow - 2) + i;
          // For schools: [NO., SCHOOL, CONFIRMED NO. OF STUDENTS, PERSON RESPONSIBLE, CONTACT]
          // Wait, the table in the screenshot is:
          // A: NO.
          // B: SCHOOL
          // C: CONFIRMED NO. OF STUDENTS
          // D: PERSON RESPONSIBLE
          // E: CONTACT
          // So it's 5 columns!
          outputData.push([sn, p.schoolName || p.name, p.noOfStudents || "", p.personResponsible || "", p.phone || ""]);
        }
        setPhoneColumnsAsText_(sheet, targetRow, outputData.length, [targetStartCol + 4]);
        sheet.getRange(targetRow, targetStartCol, outputData.length, 5).setValues(outputData);
        writeSoulsWon_(spreadsheet, peopleArray, location, swCategory);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (category === 'BRING 20') {
      targetStartCol = 1;
      var nameColIndex = 4; // Column D: NAME (Member Name)
      var maxDataRow = Math.max(4, sheet.getLastRow() + 1); // Row 3 is header, data starts at Row 4
      
      var nameColValues = sheet.getRange(4, nameColIndex, Math.max(1, maxDataRow - 3), 1).getValues();
      var targetRow = 4;
      
      for (var r = 0; r < nameColValues.length; r++) {
        if (!nameColValues[r][0] || nameColValues[r][0].toString().trim() === "") {
          targetRow = 4 + r;
          break;
        }
        if (r === nameColValues.length - 1) {
          targetRow = 4 + r + 1;
        }
      }
      
      if (peopleArray.length > 0) {
        var outputData = [];
        for (var i = 0; i < peopleArray.length; i++) {
          var p = peopleArray[i];
          var sn = (targetRow - 3) + i;
          // [NO., NAME (MIN), CONTACT (MIN), NAME, CONTACT, RESIDENCE]
          outputData.push([sn, data.location, data.ministerContact || "", p.name || "", p.phone || "", p.residence || p.church || ""]);
        }
        setPhoneColumnsAsText_(sheet, targetRow, outputData.length, [targetStartCol + 2, targetStartCol + 4]);
        sheet.getRange(targetRow, targetStartCol, outputData.length, 6).setValues(outputData);
        writeSoulsWon_(spreadsheet, peopleArray, location, swCategory);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (category === 'Serving Ministers') {
      targetStartCol = 1;
      var nameColIndex = 1; // Column A: NAME
      var maxDataRow = Math.max(1, sheet.getLastRow()); // Row 1 is header
      
      var targetRow = 2;
      var nameColValues = sheet.getRange(2, nameColIndex, Math.max(1, maxDataRow - 1), 1).getValues();
      
      for (var r = 0; r < nameColValues.length; r++) {
        if (!nameColValues[r][0] || nameColValues[r][0].toString().trim() === "") {
          targetRow = 2 + r;
          break;
        }
        if (r === nameColValues.length - 1) {
          targetRow = 2 + r + 1;
        }
      }
      
      if (peopleArray.length > 0) {
        var outputData = [];
        for (var i = 0; i < peopleArray.length; i++) {
          var p = peopleArray[i];
          // [NAME, CONTACT, MANIFEST LOCATION, DEPT]
          outputData.push([p.name || "", p.phone || "", p.manifest || "", p.department || ""]);
        }
        setPhoneColumnsAsText_(sheet, targetRow, outputData.length, [2]);
        sheet.getRange(targetRow, 1, outputData.length, 4).setValues(outputData);
        writeSoulsWon_(spreadsheet, peopleArray, location, swCategory);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Read Row 1 (Location Headers) and Row 2 (Column Headers like "NO.")
    var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var row2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    
    var targetStartCol = -1; // 1-indexed
    var locationStr = location.toString().trim().toUpperCase();
    
    // 1. Search for the location block in Row 1 (blocks start at column F; A-E is the summary table)
    for (var c = 5; c < row1.length; c++) {
      if (row1[c] && row1[c].toString().trim().toUpperCase() === locationStr) {
        targetStartCol = c + 1; // Found existing block
        break;
      }
    }
    
    // 2. If not found (e.g. new campus out of entebbe), find an empty block and claim it
    if (targetStartCol === -1) {
      // Scan Row 2 for "NO." to find valid block starting points (ignoring summary table in cols A-E)
      for (var c = 5; c < row2.length; c++) {
        var headerName = row2[c] ? row2[c].toString().trim().toUpperCase() : "";
        if (headerName === "NO.") {
          // Check if Row 1 is empty above this block
          if (!row1[c] || row1[c].toString().trim() === "") {
            targetStartCol = c + 1;
            // Claim this block by writing the location name in Row 1
            sheet.getRange(1, targetStartCol).setValue(locationStr);
            sheet.getRange(1, targetStartCol).setFontWeight("bold").setBackground("#ff9900").setFontColor("white").setHorizontalAlignment("center");
            break;
          }
        }
      }
    }
    
    // 2b. No empty block left: add a new block to the right of the last one instead of failing
    if (targetStartCol === -1) {
      targetStartCol = addBlock_(sheet, row2, locationStr);
    }

    if (targetStartCol === -1) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Could not find a valid column block for " + location}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Target block is 4 columns wide starting at targetStartCol.
    // +0: NO.
    // +1: MOBILIZED / NAME
    // +2: PHONE NUMBER
    // +3: RESIDENTIAL / CAMPUS / CHURCH
    
    var nameColIndex = targetStartCol + 1;
    var maxDataRow = Math.max(3, sheet.getLastRow()); // Data starts at Row 3
    var nameColValues = sheet.getRange(3, nameColIndex, maxDataRow - 2, 1).getValues();
    
    var targetRow = 3;
    
    // 3. Find the first empty cell in the Name column for this block
    for (var r = 0; r < nameColValues.length; r++) {
      if (!nameColValues[r][0] || nameColValues[r][0].toString().trim() === "") {
        targetRow = 3 + r;
        break;
      }
      // If we reach the end and it's full, append to the next row
      if (r === nameColValues.length - 1) {
        targetRow = 3 + r + 1;
      }
    }
    
    // 4. Prepare data for bulk write
    
    if (peopleArray.length > 0) {
      var outputData = [];
      for (var i = 0; i < peopleArray.length; i++) {
        var p = peopleArray[i];
        var sn = (targetRow - 2) + i; // Auto-incrementing Serial Number based on row
        var col4Val = p.church ? p.church : location;
        outputData.push([sn, p.name, p.phone, col4Val]);
      }
      
      // Bulk write all people at once! (Extremely fast)
      setPhoneColumnsAsText_(sheet, targetRow, outputData.length, [targetStartCol + 2]);
      sheet.getRange(targetRow, targetStartCol, outputData.length, 4).setValues(outputData);
      writeSoulsWon_(spreadsheet, peopleArray, location, swCategory);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsToScan = ["CAMPUSES OUT OF ENTEBBE", "KAJJANSI RESIDENTIAL", "KAJJANSI CAMPUSES", "OTHER REGIONS"];
    var result = {};
    
    for (var i = 0; i < sheetsToScan.length; i++) {
      var sheetName = sheetsToScan[i];
      var sheet = ss.getSheetByName(sheetName);
      var locations = [];
      if (sheet) {
        var lastCol = Math.min(Math.max(sheet.getLastColumn(), 50), sheet.getMaxColumns());
        var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        for (var c = 5; c < row1.length; c++) { // blocks start at column F
          var val = row1[c] ? row1[c].toString().trim() : "";
          if (val !== "" && val !== "NO." && val !== "MOBILIZED / NAME" && val !== "PHONE NUMBER" && val !== "RESIDENTIAL / CAMPUS / CHURCH" && val !== "NAME" && val !== "INSTITUTE" && val !== "RESIDENTIAL") {
            if (!locations.includes(val)) {
              locations.push(val);
            }
          }
        }
      }
      result[sheetName] = locations;
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Format phone-number cells as plain text before writing, so numbers like 0772... keep their leading 0.
// Only phone columns are changed: the NO. columns stay numbers because the summary COUNT formulas need them.
function setPhoneColumnsAsText_(sheet, row, numRows, cols) {
  for (var i = 0; i < cols.length; i++) {
    sheet.getRange(row, cols[i], numRows, 1).setNumberFormat('@');
  }
}

// Adds a new 4-column block to the right of the last block on the sheet, copying the title banner and
// column headers (rows 1-2) of the last block, and titles it. Returns the new block's column, or -1.
function addBlock_(sheet, row2, title) {
  var blockCols = [];
  for (var c = 5; c < row2.length; c++) {
    if (row2[c] && row2[c].toString().trim().toUpperCase() === "NO.") blockCols.push(c + 1);
  }
  if (blockCols.length === 0) return -1;

  var lastBlockCol = blockCols[blockCols.length - 1];
  // Keep the sheet's spacing between blocks (4 columns + 1 spacer = 5 on most tabs)
  var stride = blockCols.length > 1 ? lastBlockCol - blockCols[blockCols.length - 2] : 5;
  if (stride < 4) stride = 5;
  var newCol = lastBlockCol + stride;

  var missing = (newCol + 3) - sheet.getMaxColumns();
  if (missing > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), missing);

  sheet.getRange(1, lastBlockCol, 2, 4).copyTo(sheet.getRange(1, newCol, 2, 4));
  sheet.getRange(1, newCol).setValue(title);
  return newCol;
}

// Maps backend sheet names to the human-readable Category label for the SOULS WON sheet.
function getSoulsWonCategory_(category, sourceCategory) {
  if (sourceCategory && sourceCategory.toString().trim() !== "") {
    return sourceCategory.toString().trim();
  }
  if (category === "ENTEBBE MISSION") return "Entebbe Mission";
  if (category === "RESIDENTIALS") return "Residentials";
  if (category === "KAJJANSI RESIDENTIAL" || category === "CENTRAL REGION" || category === "OTHER REGIONS") return "Residential";
  if (category === "ENTEBBE CAMPUSES" || category === "KAJJANSI CAMPUSES" || category === "CAMPUSES OUT OF ENTEBBE") return "Campuses";
  if (category === "CHURCHES") return "Churches";
  if (category === "SCHOOLS") return "Schools";
  if (category === "BRING 20") return "Bring 20";
  return category || "";
}

// Adds everyone marked "Souls Won" to the SOULS WON tab. Called only after the main save has succeeded,
// so a failed save followed by a retry doesn't create duplicate Souls Won rows.
function writeSoulsWon_(spreadsheet, peopleArray, location, swCategory) {
  var soulsWonPeople = peopleArray.filter(function(p) { return p.soulsWon === true; });
  if (soulsWonPeople.length === 0) return;

  var swSheet = spreadsheet.getSheetByName("SOULS WON");
  if (!swSheet) return;

  var maxSwRow = Math.max(4, swSheet.getLastRow() + 1);
  var swNameColValues = swSheet.getRange(4, 2, Math.max(1, maxSwRow - 3), 1).getValues();
  var swTargetRow = 4;
  for (var sw = 0; sw < swNameColValues.length; sw++) {
    if (!swNameColValues[sw][0] || swNameColValues[sw][0].toString().trim() === "") {
      swTargetRow = 4 + sw;
      break;
    }
    if (sw === swNameColValues.length - 1) {
      swTargetRow = 4 + sw + 1;
    }
  }

  var swOutputData = [];
  for (var j = 0; j < soulsWonPeople.length; j++) {
    var sp = soulsWonPeople[j];
    var ssn = (swTargetRow - 3) + j;
    var manifestLoc = sp.church ? sp.church : location;
    swOutputData.push([ssn, sp.name, sp.phone, manifestLoc, swCategory || ""]);
  }
  setPhoneColumnsAsText_(swSheet, swTargetRow, swOutputData.length, [3]);
  swSheet.getRange(swTargetRow, 1, swOutputData.length, 5).setValues(swOutputData);
}
