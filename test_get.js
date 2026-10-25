const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygaAjFxtwQmnUK8qZN4mKSdV5g0OcV-4snozEXmGhHSWnfhaYrUTcgZR_ECBIoG9c2_w/exec";

async function run() {
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
