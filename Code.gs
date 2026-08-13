function doPost(e) {
  try {
    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);
    var category = data.category; // e.g., "RESIDENTIALS"
    var location = data.location; // e.g., "KATABI"
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
    
    var lastCol = Math.max(sheet.getLastColumn(), 50); // Ensure we read far enough right
    
    var targetStartCol = -1; // 1-indexed
    var targetRow = 3;
    var outputData = [];
    var peopleArray = data.people || [];
    
    // Fallback for single payload
    if (data.name && data.phone && peopleArray.length === 0) {
      peopleArray.push({name: data.name, phone: data.phone, church: data.church || ""});
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
        sheet.getRange(targetRow, targetStartCol, outputData.length, 5).setValues(outputData);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Read Row 1 (Location Headers) and Row 2 (Column Headers like "NO.")
    var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var row2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    
    var targetStartCol = -1; // 1-indexed
    var locationStr = location.toString().trim().toUpperCase();
    
    // 1. Search for the location block in Row 1
    for (var c = 0; c < row1.length; c++) {
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
      sheet.getRange(targetRow, targetStartCol, outputData.length, 4).setValues(outputData);
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
    // Fetch exclusively from the out of Entebbe campuses sheet so we don't mix in churches and residentials
    var sheetsToScan = ["CAMPUSES OUT OF ENTEBBE"];
    var allLocations = [];
    
    for (var i = 0; i < sheetsToScan.length; i++) {
      var sheet = ss.getSheetByName(sheetsToScan[i]);
      if (sheet) {
        var lastCol = Math.max(sheet.getLastColumn(), 50);
        var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        for (var c = 0; c < row1.length; c++) {
          var val = row1[c] ? row1[c].toString().trim() : "";
          // Ignore empty strings and summary table headers
          if (val !== "" && val !== "NO." && val !== "MOBILIZED / NAME" && val !== "PHONE NUMBER" && val !== "RESIDENTIAL / CAMPUS / CHURCH") {
            // Found a location block!
            if (!allLocations.includes(val)) {
              allLocations.push(val);
            }
          }
        }
      }
    }
    
    // Return standard JSON but ensure CORS by relying on Google's default execution redirect
    return ContentService.createTextOutput(JSON.stringify(allLocations))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
