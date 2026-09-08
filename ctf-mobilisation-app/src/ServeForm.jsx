import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { DATA, DEPARTMENTS } from './data';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxT6ECu0cFglKrAFBPmf20MHuQsn414KcINBNdQMdVjuq9yknfkfMI_9vDnO9hxGQKtyg/exec";

export default function ServeForm({ onBack }) {
  const [person, setPerson] = useState({ name: '', phone: '', manifest: '', customManifest: '', department: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handlePersonChange = (field, value) => {
    setPerson({ ...person, [field]: value });

    if (validationErrors[field]) {
      const newErrors = { ...validationErrors, [field]: false };
      setValidationErrors(newErrors);

      if (!Object.values(newErrors).some(Boolean)) {
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
      setPerson({ name: '', phone: '', manifest: '', customManifest: '', department: '' });
      setValidationErrors({});
    } else {
      onBack();
    }
  };

  const validate = () => {
    let isValid = true;
    const newErrors = {};

    if (!person.name.trim()) { newErrors.name = true; isValid = false; }
    if (!person.phone.trim() || getPhoneError(person.phone)) { newErrors.phone = true; isValid = false; }
    if (!person.manifest.trim()) { newErrors.manifest = true; isValid = false; }
    if (person.manifest === 'OTHER' && !person.customManifest.trim()) { newErrors.customManifest = true; isValid = false; }
    if (!person.department.trim()) { newErrors.department = true; isValid = false; }

    setValidationErrors(newErrors);
    if (!isValid) {
      setErrorMessage("Please fix any errors and ensure all required fields are filled.");
      setStatus('error');
    }
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');
    setErrorMessage('');

    const payload = {
      category: "Serving Ministers",
      location: "Serving Ministers",
      people: [{
        name: person.name.trim(),
        phone: person.phone.trim(),
        manifest: person.manifest === 'OTHER' ? person.customManifest.trim() : person.manifest.trim(),
        department: person.department.trim()
      }]
    };

    try {
      fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(err => console.error("Network request failed", err));

      // Simulate network request UI
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('success');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage("A network error occurred. Please try again.");
      setStatus('error');
    }
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
      <p className="text-gray-300 text-sm">Successfully recorded the minister.</p>
      <button
        onClick={handleGoBack}
        className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors backdrop-blur-sm"
      >
        Add More
      </button>
    </motion.div>
  );

  const renderLoadingScreen = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center space-y-6"
    >
      <Loader2 className="w-16 h-16 text-green-500 animate-spin" />
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-white transition-all">
          Registering data securely...
        </h3>
        <p className="text-sm text-gray-400 h-5 transition-all">
          Please wait
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 w-full pt-12 pb-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(1, 135, 23, 0.1)' }}
      >
        {/* Header */}
        <div className="bg-black/60 p-6 text-center border-b border-white/5 relative shrink-0">
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
            CTF <span className="text-green-500">Serving Form</span>
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">
            Serving Ministers
          </p>
        </div>

        {/* Content */}
        <div className="p-6 relative flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {status === 'success' && renderSuccess()}
            {status === 'loading' && renderLoadingScreen()}
            {status !== 'success' && status !== 'loading' && (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">
                        1
                      </div>
                      Minister Details
                    </h3>
                  </div>

                  <div className="relative pt-1">
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => handlePersonChange('name', e.target.value)}
                      placeholder=" "
                      disabled={status === 'loading'}
                      className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                        ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-green-500 focus:ring-green-500/50'}`}
                      required
                    />
                    <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                        ${validationErrors.name ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-green-500'}`}>
                      Full Name
                    </label>
                  </div>

                  <div className="relative pt-1">
                    <input
                      type="tel"
                      value={person.phone}
                      onChange={(e) => handlePersonChange('phone', e.target.value)}
                      placeholder=" "
                      disabled={status === 'loading'}
                      className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                        ${(validationErrors.phone || (person.phone && getPhoneError(person.phone))) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-green-500 focus:ring-green-500/50'}`}
                      required
                    />
                    <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                        ${(validationErrors.phone || (person.phone && getPhoneError(person.phone))) ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-green-500'}`}>
                      Phone Number
                    </label>
                    <AnimatePresence>
                      {person.phone && getPhoneError(person.phone) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-red-400 mt-1.5 ml-2 font-medium"
                        >
                          {getPhoneError(person.phone)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative pt-1">
                    <select
                      value={person.manifest}
                      onChange={(e) => handlePersonChange('manifest', e.target.value)}
                      disabled={status === 'loading'}
                      className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all appearance-none
                        ${validationErrors.manifest ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-green-500 focus:ring-green-500/50'}
                        ${person.manifest ? 'text-white' : 'text-gray-400'}`}
                      required
                    >
                      <option value="" disabled hidden>Select Manifest Location</option>
                      {DATA.MANIFESTS.map(m => (
                        <option key={m} value={m} className="text-black bg-white">{m}</option>
                      ))}
                      <option value="OTHER" className="text-black bg-white">OTHER</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none pt-1">
                      <ChevronRight className="w-4 h-4 text-gray-500 rotate-90" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {person.manifest === 'OTHER' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative pt-1 overflow-hidden"
                      >
                        <input
                          type="text"
                          value={person.customManifest}
                          onChange={(e) => handlePersonChange('customManifest', e.target.value)}
                          placeholder=" "
                          disabled={status === 'loading'}
                          className={`floating-input w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all peer text-sm
                            ${validationErrors.customManifest ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-green-500 focus:ring-green-500/50'}`}
                          required={person.manifest === 'OTHER'}
                        />
                        <label className={`floating-label absolute left-4 top-3.5 origin-left transition-all duration-200 pointer-events-none text-sm
                            ${validationErrors.customManifest ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-400 peer-focus:text-green-500'}`}>
                          Specify Manifest Location
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative pt-1">
                    <select
                      value={person.department}
                      onChange={(e) => handlePersonChange('department', e.target.value)}
                      disabled={status === 'loading'}
                      className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all appearance-none
                        ${validationErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-green-500 focus:ring-green-500/50'}
                        ${person.department ? 'text-white' : 'text-gray-400'}`}
                      required
                    >
                      <option value="" disabled hidden>Select Department</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d} className="text-black bg-white">{d}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none pt-1">
                      <ChevronRight className="w-4 h-4 text-gray-500 rotate-90" />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 mt-4"
                    >
                      <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                      <p className="text-red-200 text-xs mt-0.5">{errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-[0_0_20px_rgba(1,135,23,0.3)] text-white font-medium rounded-xl px-4 py-4 transition-all flex items-center justify-center mt-6"
                >
                  Complete Registration
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
