const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygaAjFxtwQmnUK8qZN4mKSdV5g0OcV-4snozEXmGhHSWnfhaYrUTcgZR_ECBIoG9c2_w/exec";

const payload = {
  category: "KAJJANSI CAMPUSES",
  location: "TESTING CAMPUS BOT",
  ministerContact: "",
  people: [
    {
      name: "Bot Test",
      phone: "0772123456",
      church: "",
      soulsWon: false
    }
  ]
};

async function run() {
  try {
    console.log("Sending request...");
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log("Status Code:", res.status);
    console.log("Response Body:", text);
  } catch(e) {
    console.error("Error:", e);
  }
}

run();
