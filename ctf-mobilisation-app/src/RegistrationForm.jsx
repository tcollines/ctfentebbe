import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Plus, Trash2, ChevronRight, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DATA, ALL_RESIDENCES, CENTRAL_MANIFESTS } from './data';
import { SCRIPT_URL, submitToSheet } from './sheetApi';

// Registration steps. Not every path visits every step (see flowSteps inside the component).
const STEP_LOCATION = 1; // Entebbe / Kajjansi / Central Region / Other Regions
const STEP_MANIFEST = 2; // Central Region: pick a manifest. Other Regions: type the manifest name
const STEP_CATEGORY = 3; // Residential / Campuses / Churches / ...
const STEP_DETAILS = 4;  // Residential area, campus, church role or minister details
const STEP_PEOPLE = 5;   // Add people and submit

const REGIONAL_LOCATIONS = ['CENTRAL REGION', 'OTHER REGIONS'];

const toTitleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export default function RegistrationForm({ onBack }) {
  const [step, setStep] = useState(STEP_LOCATION);
  const [region, setRegion] = useState(''); // Option picked on the first screen (DATA.LOCATIONS)
  const [manifest, setManifest] = useState(''); // Actual manifest, e.g. ENTEBBE, BUGEMBO or a typed Other Regions name
  const [otherManifestName, setOtherManifestName] = useState('');
  const [manifestError, setManifestError] = useState('');
  const [category, setCategory] = useState('');
  const [subOption, setSubOption] = useState(''); // Location/Campus/Role
  const [instituteName, setInstituteName] = useState('');
  const [ministerName, setMinisterName] = useState('');
  const [ministerPhone, setMinisterPhone] = useState('');

  const [people, setPeople] = useState([{ name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '', residence: '', soulsWon: false }]);

  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]); // array of objects matching people array
  const [loadingStage, setLoadingStage] = useState(0); // 0: compiling, 1: registering, 2: submitting

  const [existingBlocks, setExistingBlocks] = useState({});

  const fileInputRef = useRef(null);

  const isRegional = REGIONAL_LOCATIONS.includes(region);
  // Central Region / Other Regions residential and Entebbe schools go straight from category to people
  const skipsDetails = (isRegional && category === 'Residential') || (region === 'ENTEBBE' && category === 'Schools');
  const flowSteps = [
    STEP_LOCATION,
    ...(isRegional ? [STEP_MANIFEST] : []),
    STEP_CATEGORY,
    ...(skipsDetails ? [] : [STEP_DETAILS]),
    STEP_PEOPLE
  ];

  // Existing block names on a sheet (for autocomplete), without the sheet's title banner
  const blockSuggestions = (sheetName) =>
    (existingBlocks[sheetName] || []).filter(v => String(v).trim().toUpperCase() !== 'CATCH THE FIRE ENTEBBE');

  React.useEffect(() => {
    // Silently fetch existing blocks in the background
    fetch(SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data) && !data.status) {
          setExistingBlocks(data);
        } else if (Array.isArray(data)) {
          // Fallback for old cached script response
          setExistingBlocks({ 'CAMPUSES OUT OF ENTEBBE': data });
        }
      })
      .catch(err => console.error("Failed to fetch blocks", err));
  }, []);

  // ---------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------

  const handleLocationSelect = (loc) => {
    setRegion(loc);
    setCategory('');
    setSubOption('');
    setManifestError('');

    if (REGIONAL_LOCATIONS.includes(loc)) {
      // Central Region: pick a manifest from the list. Other Regions: type the manifest name.
      setManifest('');
      setStep(STEP_MANIFEST);
    } else {
      // Entebbe and Kajjansi are manifests in their own right
      setManifest(loc);
      setStep(STEP_CATEGORY);
    }
  };

  const handleManifestSelect = (m) => {
    setManifest(m);
    setCategory('');
    setSubOption('');
    setStep(STEP_CATEGORY);
  };

  const handleOtherManifestSubmit = (e) => {
    e.preventDefault();
    const name = otherManifestName.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!name) return;

    // Keep listed manifests in their own sheets
    if (name === 'ENTEBBE' || name === 'KAJJANSI') {
      setManifestError(`${name} has its own option. Go back and select it there.`);
      return;
    }
    // Also catch either half of a combined name such as LUGAZI/BUIKWE
    const centralMatch = CENTRAL_MANIFESTS.find(m => m === name || m.split('/').includes(name));
    if (centralMatch) {
      setManifestError(`${centralMatch} is under Central Region. Go back and select it there.`);
      return;
    }

    setManifestError('');
    setOtherManifestName(name);
    handleManifestSelect(name);
  };

  const handleCategorySelect = (c) => {
    setCategory(c);
    setSubOption('');

    if (isRegional && c === 'Residential') {
      // For Central Region / Other Regions Residential, location is the manifest itself. Skip the details step.
      setSubOption(manifest);
      setStep(STEP_PEOPLE);
    } else if (region === 'ENTEBBE' && c === 'Schools') {
      // Schools don't have a sub-option, we collect school name per person
      setSubOption('Schools');
      setStep(STEP_PEOPLE);
    } else if (region === 'ENTEBBE' && c === 'Bring 20') {
      setSubOption('Bring 20');
      setStep(STEP_DETAILS);
    } else {
      setStep(STEP_DETAILS);
    }
  };

  const handleSubOptionSubmit = (e) => {
    e.preventDefault();
    if (subOption.trim()) {
      setStep(STEP_PEOPLE);
    }
  };

  const handleAddPerson = () => {
    setPeople([...people, { name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '', residence: '', soulsWon: false }]);
    setValidationErrors([...validationErrors, {}]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) return; // Need at least headers and one row

        const headers = data[0].map(h => String(h).toLowerCase().trim());

        // Try to guess the columns
        let nameIdx = headers.findIndex(h => h.includes('name'));
        let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('number') || h.includes('tel'));
        let churchIdx = headers.findIndex(h => h.includes('church') || h.includes('ministry'));
        let residenceIdx = headers.findIndex(h => h.includes('residence') || h.includes('location') || h.includes('place'));
        let soulsWonIdx = headers.findIndex(h => h.includes('soul') || h.includes('won'));

        // Fallbacks if headers are generic or missing
        if (nameIdx === -1) nameIdx = 0; // Assume first column is name
        if (phoneIdx === -1) phoneIdx = 1; // Assume second column is phone
        if (residenceIdx === -1 && category === 'Bring 20') residenceIdx = 2; // Assume 3rd column is residence for bring 20

        const newPeople = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          // Skip completely empty rows
          if (!row || row.length === 0 || (!row[nameIdx] && !row[phoneIdx])) continue;

          let parsedPhone = row[phoneIdx] ? String(row[phoneIdx]).replace(/[^0-9+]/g, '').trim() : '';
          
          // Fix leading zero if stripped by Excel (e.g. 772123456 -> 0772123456)
          if (parsedPhone.length === 9 && parsedPhone.startsWith('7')) {
            parsedPhone = '0' + parsedPhone;
          }

          newPeople.push({
            name: row[nameIdx] ? String(row[nameIdx]).trim() : '',
            phone: parsedPhone,
            church: churchIdx !== -1 && row[churchIdx] ? String(row[churchIdx]).trim() : '',
            residence: residenceIdx !== -1 && row[residenceIdx] ? String(row[residenceIdx]).trim() : '',
            soulsWon: soulsWonIdx !== -1 && row[soulsWonIdx] ? Boolean(String(row[soulsWonIdx]).match(/^(true|yes|y|1|won)$/i)) : false
          });
        }

        if (newPeople.length > 0) {
          // If current list is just one empty person, replace it completely. Otherwise append.
          if (people.length === 1 && !people[0].name && !people[0].phone) {
            setPeople(newPeople);
            setValidationErrors(Array(newPeople.length).fill({}));
          } else {
            setPeople([...people, ...newPeople]);
            setValidationErrors([...validationErrors, ...Array(newPeople.length).fill({})]);
          }
          setErrorMessage('');
          setStatus('idle');
        }
      } catch (error) {
        console.error("Error parsing Excel:", error);
        setErrorMessage("Failed to read Excel file. Please ensure it's a valid format.");
        setStatus('error');
      }

      // Reset input so they can upload the same file again if they want
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleRemovePerson = (index) => {
    if (people.length > 1) {
      setPeople(people.filter((_, i) => i !== index));
      setValidationErrors(validationErrors.filter((_, i) => i !== index));
    }
  };

  const handlePersonChange = (index, field, value) => {
    const newPeople = [...people];
    newPeople[index][field] = value;
    setPeople(newPeople);

    if (validationErrors[index]?.[field]) {
      const newErrors = [...validationErrors];
      newErrors[index] = { ...newErrors[index], [field]: false };
      setValidationErrors(newErrors);

      // If there are no errors remaining across all fields for all people, clear the global error status
      if (!newErrors.some(e => Object.values(e).some(Boolean))) {
        setStatus('idle');
        setErrorMessage('');
      }
    }
  };

  const getPhoneError = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (phone.startsWith('256') || phone.startsWith('+256')) {
      return digits.length === 12 ? null : 'Must be exactly 12 digits';
    } else if (phone.startsWith('07') || phone.startsWith('0')) {
      return digits.length === 10 ? null : 'Must be exactly 10 digits';
    } else {
      return 'Must start with 07 or 256';
    }
  };

  const handleGoBack = () => {
    if (status === 'success') {
      setStatus('idle');
      setStep(STEP_LOCATION);
      setRegion('');
      setManifest('');
      setOtherManifestName('');
      setManifestError('');
      setCategory('');
      setSubOption('');
      setInstituteName('');
      setMinisterName('');
      setMinisterPhone('');
      setPeople([{ name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '', residence: '', soulsWon: false }]);
      return;
    }

    if (step > STEP_LOCATION && status !== 'loading') {
      // Go back to the previous step on this path (skipped steps are not in flowSteps)
      const idx = flowSteps.indexOf(step);
      setStep(idx > 0 ? flowSteps[idx - 1] : STEP_LOCATION);
    } else if (step === STEP_LOCATION) {
      onBack();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((subOption.toUpperCase() === 'OTHER' || (region === 'ENTEBBE' && category === 'Campuses' && subOption === 'ALUMNI')) && !instituteName.trim()) {
      setErrorMessage(subOption === 'ALUMNI' ? "Please provide the Institution." : "Please provide the Institute Name.");
      setStatus('error');
      return;
    }

    // Validation
    const newErrors = people.map(p => {
      if (category === 'Schools') {
        return {
          schoolName: !p.schoolName.trim(),
          noOfStudents: !p.noOfStudents.trim(),
          personResponsible: !p.personResponsible.trim(),
          phone: !p.phone.trim() || !!getPhoneError(p.phone)
        };
      }
      if (category === 'Bring 20') {
        return {
          name: !p.name.trim(),
          phone: !p.phone.trim() || !!getPhoneError(p.phone),
          residence: !p.residence.trim()
        };
      }
      return {
        name: !p.name.trim(),
        phone: !p.phone.trim() || !!getPhoneError(p.phone),
        church: region === 'ENTEBBE' && category === 'Churches' && !p.church.trim()
      };
    });

    if (newErrors.some(e => Object.values(e).some(Boolean))) {
      setValidationErrors(newErrors);
      setErrorMessage("Please fix any errors and ensure all required fields are filled.");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Map frontend selection to correct backend sheet category and location
      let backendCategory = '';
      let backendLocation = subOption;

      if (subOption.toUpperCase() === 'OTHER') {
        backendLocation = instituteName;
      }

      if (region === 'ENTEBBE') {
        if (category === 'Residentials') backendCategory = 'RESIDENTIALS';
        if (category === 'Campuses') backendCategory = 'ENTEBBE CAMPUSES';
        if (category === 'Churches') backendCategory = 'CHURCHES';
        if (category === 'Schools') backendCategory = 'SCHOOLS';
        if (category === 'Bring 20') {
          backendCategory = 'BRING 20';
          backendLocation = ministerName;
        }
      } else if (region === 'KAJJANSI') {
        if (category === 'Residential') backendCategory = 'KAJJANSI RESIDENTIAL';
        if (category === 'Campuses') backendCategory = 'KAJJANSI CAMPUSES';
      } else if (region === 'CENTRAL REGION') {
        if (category === 'Residential') backendCategory = 'CENTRAL REGION';
        if (category === 'Campuses') backendCategory = 'CAMPUSES OUT OF ENTEBBE';
      } else if (region === 'OTHER REGIONS') {
        if (category === 'Residential') backendCategory = 'OTHER REGIONS';
        if (category === 'Campuses') backendCategory = 'CAMPUSES OUT OF ENTEBBE';
      }

      // Send all people in ONE single request
      const payload = {
        category: backendCategory,
        location: backendLocation,
        ministerContact: ministerPhone,
        people: people.map(p => ({
          ...p,
          church: (subOption.toUpperCase() === 'OTHER' || (region === 'ENTEBBE' && category === 'Campuses' && subOption === 'ALUMNI')) ? instituteName : p.church
        }))
      };

      // Wait for the sheet to confirm the save. The progress text steps along while we wait,
      // and success only shows once the save is confirmed; any failure shows an error below.
      setLoadingStage(0);
      const stageTimers = [
        setTimeout(() => setLoadingStage(1), 1500),
        setTimeout(() => setLoadingStage(2), 3000),
      ];
      try {
        await submitToSheet(payload);
      } finally {
        stageTimers.forEach(clearTimeout);
      }

      setStatus('success');

    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || "An error occurred while submitting.");
    }
  };

  // ---------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------

  const renderLocationStep = () => {
    const hints = {
      'CENTRAL REGION': `${CENTRAL_MANIFESTS.slice(0, 3).map(toTitleCase).join(', ')} and ${CENTRAL_MANIFESTS.length - 3} more`,
      'OTHER REGIONS': 'Type in the name of your manifest'
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-medium text-white mb-4">Select Manifest Location</h3>
        <div className="grid grid-cols-1 gap-3">
          {DATA.LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocationSelect(loc)}
              className={`px-4 py-4 rounded-xl text-left font-medium transition-all flex items-center justify-between border
                ${loc === 'ENTEBBE'
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 hover:bg-orange-500/20 text-lg shadow-[0_0_15px_rgba(253,106,59,0.15)]'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
            >
              <span className="flex flex-col">
                <span>{loc}</span>
                {hints[loc] && <span className="text-xs font-normal text-gray-500 mt-1">{hints[loc]}</span>}
              </span>
              <ChevronRight className={`w-5 h-5 flex-shrink-0 ${loc === 'ENTEBBE' ? 'text-orange-500' : 'text-gray-500'}`} />
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderManifestStep = () => {
    if (region === 'OTHER REGIONS') {
      return (
        <motion.form
          onSubmit={handleOtherManifestSubmit}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Name of Manifest</h3>

          <div className="relative pt-2">
            <input
              type="text"
              list="other-manifests-list"
              value={otherManifestName}
              onChange={(e) => { setOtherManifestName(e.target.value); setManifestError(''); }}
              placeholder=" "
              className={`floating-input w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-1 transition-all peer
                ${manifestError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
              required
            />
            <datalist id="other-manifests-list">
              {blockSuggestions('OTHER REGIONS').map((val, idx) => (
                <option key={idx} value={val} />
              ))}
            </datalist>
            <label className={`floating-label absolute left-4 top-5.5 origin-left transition-all duration-200 pointer-events-none
                ${manifestError ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
              Enter Manifest Name
            </label>
            <AnimatePresence>
              {manifestError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 mt-1.5 ml-2 font-medium"
                >
                  {manifestError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl px-4 py-3.5 transition-colors"
          >
            Continue
          </button>
        </motion.form>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-medium text-white mb-4">Select Manifest in Central Region</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {CENTRAL_MANIFESTS.map((m) => (
            <button
              key={m}
              onClick={() => handleManifestSelect(m)}
              className={`px-4 py-4 rounded-xl text-left font-medium transition-all flex items-center justify-between border
                ${m === manifest
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
            >
              <span>{m}</span>
              <ChevronRight className={`w-5 h-5 ${m === manifest ? 'text-orange-500' : 'text-gray-500'}`} />
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderCategoryStep = () => {
    const cats = region === 'ENTEBBE' ? DATA.ENTEBBE_CATEGORIES : DATA.OTHER_CATEGORIES;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-medium text-white mb-4">Select Category for {manifest}</h3>
        <div className="grid grid-cols-1 gap-3">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => handleCategorySelect(c)}
              className="px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-left text-gray-200 font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-between"
            >
              <span>{c}</span>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderDetailsStep = () => {
    if (category === 'Bring 20') {
      return (
        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            if (getPhoneError(ministerPhone)) return;
            setStep(STEP_PEOPLE);
          }}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Minister Details</h3>

          <div className="relative pt-1">
            <input
              type="text"
              value={ministerName}
              onChange={(e) => setMinisterName(e.target.value)}
              placeholder=" "
              className="floating-input w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 transition-all peer text-sm"
              required
            />
            <label className="floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm text-gray-400 peer-focus:text-orange-500">
              Minister's Full Name
            </label>
          </div>

          <div className="relative pt-1">
            <input
              type="tel"
              value={ministerPhone}
              onChange={(e) => setMinisterPhone(e.target.value)}
              placeholder=" "
              className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                ${(ministerPhone && getPhoneError(ministerPhone)) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
              required
            />
            <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                ${(ministerPhone && getPhoneError(ministerPhone)) ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
              Minister's Phone Number
            </label>
            <AnimatePresence>
              {ministerPhone && getPhoneError(ministerPhone) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 mt-1.5 ml-2 font-medium"
                >
                  {getPhoneError(ministerPhone)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl px-4 py-3.5 transition-colors mt-4"
          >
            Continue
          </button>
        </motion.form>
      );
    }

    let options = [];
    let placeholder = "";
    let isInput = false;

    if (region === 'ENTEBBE') {
      if (category === 'Residentials') { options = DATA.ENTEBBE_RESIDENTIALS; placeholder = "Select Residential Area"; }
      if (category === 'Campuses') { options = DATA.ENTEBBE_CAMPUSES; placeholder = "Select Campus"; }
      if (category === 'Churches') { options = DATA.CHURCH_ROLES; placeholder = "Select Role"; }
    } else {
      if (category === 'Campuses' || region === 'KAJJANSI') {
        isInput = true;
        placeholder = category === 'Residential' ? "Enter Residential Area" : "Enter Campus Name";
      }
    }

    return (
      <motion.form
        onSubmit={handleSubOptionSubmit}
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <h3 className="text-lg font-medium text-white mb-4">
          {region === 'ENTEBBE' && category === 'Churches' ? 'Are you a Pastor or Member?' : `Specify ${category}`}
        </h3>

        {isInput ? (
          <div className="relative pt-2">
            <input
              type="text"
              list="campuses-list"
              value={subOption}
              onChange={(e) => setSubOption(e.target.value)}
              placeholder=" "
              className="floating-input w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all peer"
              required
            />
            <datalist id="campuses-list">
              {(
                region === 'KAJJANSI' && category === 'Residential' ? blockSuggestions('KAJJANSI RESIDENTIAL') :
                  region === 'KAJJANSI' && category === 'Campuses' ? blockSuggestions('KAJJANSI CAMPUSES') :
                    blockSuggestions('CAMPUSES OUT OF ENTEBBE')
              ).map((val, idx) => (
                <option key={idx} value={val} />
              ))}
            </datalist>
            <label className="floating-label absolute text-gray-400 left-4 top-5.5 origin-left transition-all duration-200 pointer-events-none peer-focus:text-orange-500">
              {placeholder}
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {options.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => { setSubOption(opt); setStep(STEP_PEOPLE); }}
                className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-left text-gray-200 font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-between"
              >
                <span>{opt}</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            ))}
          </div>
        )}

        {isInput && (
          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl px-4 py-3.5 transition-colors"
          >
            Continue
          </button>
        )}
      </motion.form>
    );
  };

  const renderPeopleStep = () => (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Add People</h3>
        <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
          {category} • {subOption}
        </span>
      </div>

      {((subOption.toUpperCase() === 'OTHER') || (region === 'ENTEBBE' && category === 'Campuses' && subOption === 'ALUMNI')) && (
        <div className="relative pt-1 mb-6">
          <input
            type="text"
            value={instituteName}
            onChange={(e) => setInstituteName(e.target.value)}
            placeholder=" "
            disabled={status === 'loading'}
            className="floating-input w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all peer text-sm"
            required
          />
          <label className="floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm text-gray-400 peer-focus:text-orange-500">
            {subOption === 'ALUMNI' ? 'Institution' : 'Institute Name'}
          </label>
        </div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{errorMessage}</p>
        </motion.div>
      )}

      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {people.map((p, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="p-4 bg-white/5 border border-white/10 rounded-2xl relative space-y-4"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-400">Person {index + 1}</span>
                {people.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(index)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {category === 'Schools' ? (
                <>
                  <div className="relative pt-1">
                    <input
                      type="text"
                      value={p.schoolName}
                      onChange={(e) => handlePersonChange(index, 'schoolName', e.target.value)}
                      placeholder=" "
                      disabled={status === 'loading'}
                      className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                        ${validationErrors[index]?.schoolName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                      required
                    />
                    <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                        ${validationErrors[index]?.schoolName ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                      School Name
                    </label>
                  </div>
                  <div className="relative pt-1 mt-4">
                    <input
                      type="number"
                      value={p.noOfStudents}
                      onChange={(e) => handlePersonChange(index, 'noOfStudents', e.target.value)}
                      placeholder=" "
                      disabled={status === 'loading'}
                      className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                        ${validationErrors[index]?.noOfStudents ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                      required
                    />
                    <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                        ${validationErrors[index]?.noOfStudents ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                      Confirmed No. of Students
                    </label>
                  </div>
                  <div className="relative pt-1 mt-4">
                    <input
                      type="text"
                      value={p.personResponsible}
                      onChange={(e) => handlePersonChange(index, 'personResponsible', e.target.value)}
                      placeholder=" "
                      disabled={status === 'loading'}
                      className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                        ${validationErrors[index]?.personResponsible ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                      required
                    />
                    <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                        ${validationErrors[index]?.personResponsible ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                      Person Responsible
                    </label>
                  </div>
                </>
              ) : (
                <div className="relative pt-1">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handlePersonChange(index, 'name', e.target.value)}
                    placeholder=" "
                    disabled={status === 'loading'}
                    className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                      ${validationErrors[index]?.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                    required
                  />
                  <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                      ${validationErrors[index]?.name ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                    Full Name
                  </label>
                </div>
              )}

              <div className="relative pt-1">
                <input
                  type="tel"
                  value={p.phone}
                  onChange={(e) => handlePersonChange(index, 'phone', e.target.value)}
                  placeholder=" "
                  disabled={status === 'loading'}
                  className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                    ${(validationErrors[index]?.phone || (p.phone && getPhoneError(p.phone))) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                  required
                />
                <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                    ${(validationErrors[index]?.phone || (p.phone && getPhoneError(p.phone))) ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                  {category === 'Schools' ? 'Contact' : 'Phone Number'}
                </label>
                <AnimatePresence>
                  {p.phone && getPhoneError(p.phone) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-red-400 mt-1.5 ml-2 font-medium"
                    >
                      {getPhoneError(p.phone)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {category === 'Bring 20' && (
                <div className="relative pt-1">
                  <input
                    type="text"
                    list="residences-list"
                    value={p.residence || ''}
                    onChange={(e) => handlePersonChange(index, 'residence', e.target.value)}
                    placeholder=" "
                    disabled={status === 'loading'}
                    className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                      ${validationErrors[index]?.residence ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                    required
                  />
                  <datalist id="residences-list">
                    {ALL_RESIDENCES.map((res, idx) => (
                      <option key={idx} value={res} />
                    ))}
                  </datalist>
                  <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                      ${validationErrors[index]?.residence ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                    Place of Residence
                  </label>
                </div>
              )}

              {region === 'ENTEBBE' && category === 'Churches' && (
                <div className="relative pt-1">
                  <input
                    type="text"
                    value={p.church}
                    onChange={(e) => handlePersonChange(index, 'church', e.target.value)}
                    placeholder=" "
                    disabled={status === 'loading'}
                    className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                      ${validationErrors[index]?.church ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/50'}`}
                    required
                  />
                  <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                      ${validationErrors[index]?.church ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-orange-500'}`}>
                    Ministry / Church
                  </label>
                </div>
              )}

              {category !== 'Schools' && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-gray-300">Souls Won</span>
                  <button
                    type="button"
                    onClick={() => handlePersonChange(index, 'soulsWon', !p.soulsWon)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.soulsWon ? 'bg-orange-500' : 'bg-white/10'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.soulsWon ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAddPerson}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-xl text-gray-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Person
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-orange-500/30 rounded-xl text-orange-400 hover:text-orange-300 hover:border-orange-500/60 hover:bg-orange-500/5 transition-all text-sm font-medium"
        >
          <Upload className="w-4 h-4" /> Upload Excel
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        type="submit"
        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-[0_0_20px_rgba(253,106,59,0.3)] text-white font-medium rounded-xl px-4 py-4 transition-all flex items-center justify-center mt-4"
      >
        Complete Registration ({people.length})
      </motion.button>
    </motion.form>
  );

  const renderLoadingScreen = () => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-6"
      >
        <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white transition-all">
            {loadingStage === 0 && `Compiling ${people.length} record${people.length > 1 ? 's' : ''}...`}
            {loadingStage === 1 && "Registering data securely..."}
            {loadingStage === 2 && "Submitting to database..."}
          </h3>
          <p className="text-sm text-gray-400 h-5 transition-all">
            {loadingStage === 2 ? "This may take a moment, please don't close the app." : "Please wait"}
          </p>
        </div>

        {/* Progress indicator dots */}
        <div className="flex gap-3 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: loadingStage >= i ? '#f97316' : '#374151',
                scale: loadingStage === i ? 1.2 : 1
              }}
              className="w-2.5 h-2.5 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    );
  };

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-10 text-center space-y-4"
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white">Data Submitted!</h2>
      <p className="text-gray-300 text-sm">Successfully recorded {people.length} {people.length === 1 ? 'person' : 'people'}.</p>
      <button
        onClick={handleGoBack}
        className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors backdrop-blur-sm"
      >
        Add More
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 w-full pt-12 pb-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(253, 106, 59, 0.1)' }}
      >
        {/* Header */}
        <div className="bg-black/60 p-6 text-center border-b border-white/5 relative">
          {status !== 'success' && (
            <button
              onClick={handleGoBack}
              disabled={status === 'loading'}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            CTF <span className="text-orange-500">Registration</span>
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {flowSteps.map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? 'bg-orange-500' : 'bg-white/10'} ${step === s ? 'w-6' : 'w-2'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {status === 'success' && renderSuccess()}
            {status === 'loading' && renderLoadingScreen()}
            {status !== 'success' && status !== 'loading' && step === STEP_LOCATION && <motion.div key="s1" className="h-full">{renderLocationStep()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === STEP_MANIFEST && <motion.div key="s2" className="h-full">{renderManifestStep()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === STEP_CATEGORY && <motion.div key="s3" className="h-full">{renderCategoryStep()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === STEP_DETAILS && <motion.div key="s4" className="h-full">{renderDetailsStep()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === STEP_PEOPLE && <motion.div key="s5" className="h-full">{renderPeopleStep()}</motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
