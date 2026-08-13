import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Plus, Trash2, ChevronRight, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DATA } from './data';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbysRn-mDKfyMOCbyWFltvzGeXf60VDXGe1RuaXoen5ng79OSXK74PsW66JK4Ox27vWL1Q/exec"; // Wait for user to provide, or they will edit it.

export default function RegistrationForm({ onBack }) {
  const [step, setStep] = useState(1);
  const [manifest, setManifest] = useState('');
  const [category, setCategory] = useState('');
  const [subOption, setSubOption] = useState(''); // Location/Campus/Role

  const [people, setPeople] = useState([{ name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '' }]);

  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]); // array of objects matching people array
  const [loadingStage, setLoadingStage] = useState(0); // 0: compiling, 1: registering, 2: submitting

  const [existingCampuses, setExistingCampuses] = useState([]);

  const fileInputRef = useRef(null);

  React.useEffect(() => {
    // Silently fetch existing campuses in the background
    fetch(SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setExistingCampuses(data);
      })
      .catch(err => console.error("Failed to fetch campuses", err));
  }, []);

  // ---------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------

  const handleManifestSelect = (m) => {
    setManifest(m);
    setCategory('');
    setSubOption('');
    setStep(2);
  };

  const handleCategorySelect = (c) => {
    setCategory(c);
    setSubOption('');

    if (manifest !== 'ENTEBBE' && c === 'Residential') {
      // For Central Region Residential, location is the manifest itself. Skip step 3.
      setSubOption(manifest);
      setStep(4);
    } else if (manifest === 'ENTEBBE' && c === 'Schools') {
      // Schools don't have a sub-option, we collect school name per person
      setSubOption('Schools');
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleSubOptionSubmit = (e) => {
    e.preventDefault();
    if (subOption.trim()) {
      setStep(4);
    }
  };

  const handleAddPerson = () => {
    setPeople([...people, { name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '' }]);
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

        // Fallbacks if headers are generic or missing
        if (nameIdx === -1) nameIdx = 0; // Assume first column is name
        if (phoneIdx === -1) phoneIdx = 1; // Assume second column is phone

        const newPeople = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          // Skip completely empty rows
          if (!row || row.length === 0 || (!row[nameIdx] && !row[phoneIdx])) continue;

          newPeople.push({
            name: row[nameIdx] ? String(row[nameIdx]).trim() : '',
            phone: row[phoneIdx] ? String(row[phoneIdx]).replace(/[^0-9+]/g, '').trim() : '',
            church: churchIdx !== -1 && row[churchIdx] ? String(row[churchIdx]).trim() : ''
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
      setStep(1);
      setManifest('');
      setCategory('');
      setSubOption('');
      setPeople([{ name: '', phone: '', church: '', schoolName: '', noOfStudents: '', personResponsible: '' }]);
      return;
    }

    if (step > 1 && status !== 'loading') {
      if (step === 4 && manifest !== 'ENTEBBE' && category === 'Residential') {
        setStep(2); // Skipped step 3
      } else if (step === 4 && manifest === 'ENTEBBE' && category === 'Schools') {
        setStep(2); // Skipped step 3
      } else {
        setStep(step - 1);
      }
    } else if (step === 1) {
      onBack();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      return {
        name: !p.name.trim(),
        phone: !p.phone.trim() || !!getPhoneError(p.phone),
        church: manifest === 'ENTEBBE' && category === 'Churches' && !p.church.trim()
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

      if (manifest === 'ENTEBBE') {
        if (category === 'Residentials') backendCategory = 'RESIDENTIALS';
        if (category === 'Campuses') backendCategory = 'ENTEBBE CAMPUSES';
        if (category === 'Churches') backendCategory = 'CHURCHES';
        if (category === 'Schools') backendCategory = 'SCHOOLS';
      } else {
        if (category === 'Residential') backendCategory = 'CENTRAL REGION';
        if (category === 'Campuses') backendCategory = 'CAMPUSES OUT OF ENTEBBE';
      }

      // Submit each person sequentially (or with Promise.all)
      // Since it's a simple script, sequential might be safer for sheet row locking
      // Simulated progress steps for better UX during wait
      // Send all people in ONE single request!
      const payload = {
        category: backendCategory,
        location: backendLocation,
        people: people // Array of {name, phone, church}
      };

      // FIRE AND FORGET: Start the network request in the background
      // This prevents the user from being blocked for 40+ seconds if Google is slow.
      fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script to bypass CORS redirect issues
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(err => console.error("Network request failed", err));

      // BEAUTIFUL CONTROLLED UI EXPERIENCE
      // We manually step through the UI phases for exactly 4.5 seconds to ensure a fast, premium feel.
      setLoadingStage(0);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setLoadingStage(1);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setLoadingStage(2);
      await new Promise(resolve => setTimeout(resolve, 1500));

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

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-medium text-white mb-4">Select Manifest Location</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {DATA.MANIFESTS.map((m) => (
          <button
            key={m}
            onClick={() => handleManifestSelect(m)}
            className={`px-4 py-4 rounded-xl text-left font-medium transition-all flex items-center justify-between border
              ${m === 'ENTEBBE'
                ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 hover:bg-orange-500/20 col-span-1 sm:col-span-2 text-lg shadow-[0_0_15px_rgba(253,106,59,0.15)]'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
          >
            <span>{m}</span>
            <ChevronRight className={`w-5 h-5 ${m === 'ENTEBBE' ? 'text-orange-500' : 'text-gray-500'}`} />
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderStep2 = () => {
    const cats = manifest === 'ENTEBBE' ? DATA.ENTEBBE_CATEGORIES : DATA.OTHER_CATEGORIES;
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

  const renderStep3 = () => {
    let options = [];
    let placeholder = "";
    let isInput = false;

    if (manifest === 'ENTEBBE') {
      if (category === 'Residentials') { options = DATA.ENTEBBE_RESIDENTIALS; placeholder = "Select Residential Area"; }
      if (category === 'Campuses') { options = DATA.ENTEBBE_CAMPUSES; placeholder = "Select Campus"; }
      if (category === 'Churches') { options = DATA.CHURCH_ROLES; placeholder = "Select Role"; }
    } else {
      if (category === 'Campuses') { isInput = true; placeholder = "Enter Campus Name"; }
    }

    return (
      <motion.form
        onSubmit={handleSubOptionSubmit}
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <h3 className="text-lg font-medium text-white mb-4">
          {manifest === 'ENTEBBE' && category === 'Churches' ? 'Are you a Pastor or Member?' : `Specify ${category}`}
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
              {existingCampuses.map((campus, idx) => (
                <option key={idx} value={campus} />
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
                onClick={() => { setSubOption(opt); setStep(4); }}
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

  const renderStep4 = () => (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-white">Add People</h3>
        <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
          {category} • {subOption}
        </span>
      </div>

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

              {manifest === 'ENTEBBE' && category === 'Churches' && (
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
            {[1, 2, 3, 4].map(s => (
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
            {status !== 'success' && status !== 'loading' && step === 1 && <motion.div key="s1" className="h-full">{renderStep1()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === 2 && <motion.div key="s2" className="h-full">{renderStep2()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === 3 && <motion.div key="s3" className="h-full">{renderStep3()}</motion.div>}
            {status !== 'success' && status !== 'loading' && step === 4 && <motion.div key="s4" className="h-full">{renderStep4()}</motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
