import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency, cn } from '../../lib/utils';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const RichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command, val = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300 flex-wrap">
        <button type="button" onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-sm min-w-[32px] min-h-[32px]" title="Bold">B</button>
        <button type="button" onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 italic text-sm min-w-[32px] min-h-[32px]" title="Italic">I</button>
        <button type="button" onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 underline text-sm min-w-[32px] min-h-[32px]" title="Underline">U</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 text-sm min-w-[32px] min-h-[32px]" title="Bullet List">
          <SafeIcon icon={FiIcons.FiList} />
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 text-sm min-w-[32px] min-h-[32px]" title="Numbered List">
          1.
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onClick={() => {
          const url = prompt('Enter link URL:');
          if (url) execCommand('createLink', url);
        }} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 text-sm min-w-[32px] min-h-[32px]" title="Insert Link">
          <SafeIcon icon={FiIcons.FiLink} />
        </button>
        <button type="button" onClick={() => execCommand('removeFormat')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700 text-sm min-w-[32px] min-h-[32px]" title="Clear Formatting">
          <SafeIcon icon={FiIcons.FiX} className="text-xs" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[160px] max-h-[300px] overflow-y-auto text-sm text-gray-800 focus:outline-none prose prose-sm max-w-none"
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
};

const BookingLinksTab = ({ propertyId }) => {
  const [copiedKey, setCopiedKey] = useState(null);
  const appUrl = window.location.origin;
  const directLink = `${appUrl}/booking?propertyId=${propertyId}`;
  const embedCode = `<iframe src="${appUrl}/booking?propertyId=${propertyId}" style="width:100%; height:700px; border:none; border-radius:12px; overflow:hidden;"></iframe>`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <SafeIcon icon={FiIcons.FiLink} className="text-blue-600 text-xl mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 mb-1">Direct Booking Link</h4>
            <p className="text-sm text-blue-700 mb-3">
              Share or link to this URL so guests land directly on the booking wizard for this property, skipping the selection step.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={directLink}
                className="flex-1 p-2 bg-white border border-blue-300 rounded-lg text-sm font-mono text-gray-700"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => copy(directLink, 'link')}
              >
                <SafeIcon icon={copiedKey === 'link' ? FiIcons.FiCheck : FiIcons.FiCopy} className="mr-1" />
                {copiedKey === 'link' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <SafeIcon icon={FiIcons.FiCode} className="text-gray-600 text-xl mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-1">Website Embed Code</h4>
            <p className="text-sm text-gray-600 mb-3">
              Paste this iframe snippet into your external website (e.g., WordPress) to embed the booking wizard locked to this property.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all mb-3">
              {embedCode}
            </pre>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(embedCode, 'embed')}
            >
              <SafeIcon icon={copiedKey === 'embed' ? FiIcons.FiCheck : FiIcons.FiCopy} className="mr-1" />
              {copiedKey === 'embed' ? 'Copied!' : 'Copy Embed Code'}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <SafeIcon icon={FiIcons.FiInfo} className="text-amber-600 text-lg mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold mb-1">Usage Tips</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>The direct link is ideal for "Book Now" buttons in navigation menus or email campaigns.</li>
              <li>The embed code places the full booking wizard inside an iframe on any webpage.</li>
              <li>Guests will skip property selection and go straight to the date picker.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertiesManager = () => {
  const { properties, addProperty, updateProperty, deleteProperty } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const defaultConfirmation = {
    title: 'Request Received!',
    message: "<p>We've received your booking request. An admin will review it shortly. You'll receive an email update soon.</p>",
    buttons: [{ label: 'Back to Home', url: '/', style: 'primary' }]
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseNightlyRate: 0,
    cleaningFee: 0,
    minNights: 1,
    maxGuests: 4,
    imageUrl: '',
    isActive: true,
    themeColor: '#3B82F6',
    emailTemplates: {
      confirmationTemplateId: '',
      followupTemplateId: '',
      followupDaysBefore: 1
    },
    confirmationPage: defaultConfirmation,
    icalExportToken: null,
    icalImportUrls: [],
    icalLastSyncedAt: null
  });

  const handleOpenModal = (property = null) => {
    if (property) {
      setEditingId(property.id);
      const cp = property.confirmationPage;
      const hasConfirmation = cp && (cp.title || cp.message || cp.buttons);
      setFormData({
        ...property,
        emailTemplates: property.emailTemplates || {
          confirmationTemplateId: '',
          followupTemplateId: '',
          followupDaysBefore: 1
        },
        confirmationPage: hasConfirmation
          ? { ...defaultConfirmation, ...cp, buttons: Array.isArray(cp.buttons) ? cp.buttons : defaultConfirmation.buttons }
          : { ...defaultConfirmation },
        icalExportToken: property.icalExportToken || null,
        icalImportUrls: property.icalImportUrls || [],
        icalLastSyncedAt: property.icalLastSyncedAt || null
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        baseNightlyRate: 0,
        cleaningFee: 0,
        minNights: 1,
        maxGuests: 4,
        imageUrl: '',
        isActive: true,
        themeColor: '#3B82F6',
        emailTemplates: {
          confirmationTemplateId: '',
          followupTemplateId: '',
          followupDaysBefore: 1
        },
        confirmationPage: defaultConfirmation,
        icalExportToken: null,
        icalImportUrls: [],
        icalLastSyncedAt: null
      });
    }
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const filteredImportUrls = (formData.icalImportUrls || []).filter(url => url && url.trim());
    const dataToSave = {
      name: formData.name,
      description: formData.description,
      baseNightlyRate: Number(formData.baseNightlyRate),
      cleaningFee: Number(formData.cleaningFee),
      minNights: Number(formData.minNights),
      maxGuests: Number(formData.maxGuests),
      imageUrl: formData.imageUrl,
      isActive: formData.isActive,
      themeColor: formData.themeColor,
      emailTemplates: {
        ...formData.emailTemplates,
        followupDaysBefore: Number(formData.emailTemplates.followupDaysBefore)
      },
      confirmationPage: formData.confirmationPage,
      icalImportUrls: filteredImportUrls
    };

    try {
      if (editingId) {
        await updateProperty({ ...dataToSave, id: editingId });
      } else {
        await addProperty(dataToSave);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to save property.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await deleteProperty(id);
      } catch (err) {
        alert(err.message || 'Failed to delete property.');
      }
    }
  };

  const handleConfirmationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      confirmationPage: { ...prev.confirmationPage, [field]: value }
    }));
  };

  const handleButtonChange = (index, field, value) => {
    const newButtons = [...formData.confirmationPage.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    handleConfirmationChange('buttons', newButtons);
  };

  const addButton = () => {
    if (formData.confirmationPage.buttons.length < 2) {
      handleConfirmationChange('buttons', [
        ...formData.confirmationPage.buttons,
        { label: 'New Button', url: '/', style: 'outline' }
      ]);
    }
  };

  const removeButton = (index) => {
    const newButtons = formData.confirmationPage.buttons.filter((_, i) => i !== index);
    handleConfirmationChange('buttons', newButtons);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">Manage your rental properties and base rates</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <SafeIcon icon={FiIcons.FiPlus} className="mr-2" />
          Add Property
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-2" style={{ backgroundColor: property.themeColor }} />
            {property.imageUrl && (
              <div className="h-40 overflow-hidden">
                <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{property.name}</h3>
                <div className={cn("w-3 h-3 rounded-full", property.isActive ? "bg-green-500" : "bg-gray-300")} />
              </div>
              <p className="text-gray-600 text-sm mb-6 line-clamp-2 h-10">{property.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Base Nightly Rate</span>
                  <span className="font-bold text-gray-900">{formatCurrency(property.baseNightlyRate)}/night</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Cleaning Fee</span>
                  <span className="font-bold text-gray-900">{formatCurrency(property.cleaningFee)}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Min Stay</span>
                  <span className="font-bold text-gray-900">{property.minNights} {property.minNights === 1 ? 'Night' : 'Nights'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Max Guests</span>
                  <span className="font-bold text-gray-900">{property.maxGuests}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(property)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(property.id)}>
                  <SafeIcon icon={FiIcons.FiTrash2} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Property' : 'New Property'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('general')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                  activeTab === 'general' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                General Details
              </button>
              <button
                onClick={() => setActiveTab('confirmation')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                  activeTab === 'confirmation' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                Confirmation Page
              </button>
              {editingId && (
                <button
                  onClick={() => setActiveTab('calendar-sync')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                    activeTab === 'calendar-sync' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  Calendar Sync
                </button>
              )}
              {editingId && (
                <button
                  onClick={() => setActiveTab('booking-links')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                    activeTab === 'booking-links' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  Booking Links
                </button>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="propertyForm" onSubmit={handleSave} className="space-y-4">
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Property Name</label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                      <textarea
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg h-24"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Property Image URL</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={formData.imageUrl}
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Base Nightly Rate ($)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.baseNightlyRate}
                          onChange={e => setFormData({...formData, baseNightlyRate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cleaning Fee ($)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.cleaningFee}
                          onChange={e => setFormData({...formData, cleaningFee: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Min Nights</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.minNights}
                          onChange={e => setFormData({...formData, minNights: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Max Guests</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.maxGuests}
                          onChange={e => setFormData({...formData, maxGuests: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Display Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-10 rounded cursor-pointer border border-gray-300 p-0.5"
                          value={formData.themeColor}
                          onChange={e => setFormData({...formData, themeColor: e.target.value})}
                        />
                        <input
                          type="text"
                          className="flex-1 p-2 border border-gray-300 rounded-lg uppercase"
                          value={formData.themeColor}
                          onChange={e => setFormData({...formData, themeColor: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <SafeIcon icon={FiIcons.FiMail} className="text-primary text-lg" />
                        <h4 className="font-bold text-gray-900">Email Template Configuration</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Specify Resend email template IDs for automated confirmations and follow-ups.
                      </p>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Confirmation Email Template ID</label>
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                              placeholder="e.g., 1234abcd-5678-efgh"
                              value={formData.emailTemplates?.confirmationTemplateId || ''}
                              onChange={e => setFormData({
                                ...formData,
                                emailTemplates: { ...formData.emailTemplates, confirmationTemplateId: e.target.value }
                              })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Resend template ID sent when booking is confirmed</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Follow-up Email Template ID</label>
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                              placeholder="e.g., 1234abcd-5678-efgh"
                              value={formData.emailTemplates?.followupTemplateId || ''}
                              onChange={e => setFormData({
                                ...formData,
                                emailTemplates: { ...formData.emailTemplates, followupTemplateId: e.target.value }
                              })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Resend template ID sent before check-in</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Follow-up Email Timing
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Send follow-up</span>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              className="w-20 p-2 border border-gray-300 rounded-lg text-sm text-center font-bold"
                              value={formData.emailTemplates?.followupDaysBefore || 1}
                              onChange={e => setFormData({
                                ...formData,
                                emailTemplates: {
                                  ...formData.emailTemplates,
                                  followupDaysBefore: e.target.value
                                }
                              })}
                            />
                            <span className="text-sm text-gray-600">day(s) before check-in</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            The system will automatically send the follow-up email this many days before the check-in date
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                       <input
                         type="checkbox"
                         id="isActive"
                         className="w-4 h-4 rounded text-primary focus:ring-primary"
                         checked={formData.isActive}
                         onChange={e => setFormData({...formData, isActive: e.target.checked})}
                       />
                       <label htmlFor="isActive" className="text-sm font-bold text-gray-700">Active (visible to customers)</label>
                    </div>
                  </div>
                )}

                {activeTab === 'confirmation' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Page Title</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={formData.confirmationPage.title}
                        onChange={e => handleConfirmationChange('title', e.target.value)}
                        placeholder="e.g., Request Received!"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Message Content</label>
                      <RichTextEditor
                        value={formData.confirmationPage.message}
                        onChange={val => handleConfirmationChange('message', val)}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-gray-700">Action Buttons (Max 2)</label>
                        {formData.confirmationPage.buttons.length < 2 && (
                          <button
                            type="button"
                            onClick={addButton}
                            className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
                          >
                            <SafeIcon icon={FiIcons.FiPlus} /> Add Button
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {formData.confirmationPage.buttons.map((btn, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative">
                            <button
                              type="button"
                              onClick={() => removeButton(idx)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                              title="Remove Button"
                            >
                              <SafeIcon icon={FiIcons.FiX} />
                            </button>
                            <div className="grid grid-cols-2 gap-3 pr-6">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Label</label>
                                <input
                                  type="text"
                                  value={btn.label}
                                  onChange={e => handleButtonChange(idx, 'label', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-sm"
                                  placeholder="Button Text"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">URL</label>
                                <input
                                  type="text"
                                  value={btn.url}
                                  onChange={e => handleButtonChange(idx, 'url', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-sm"
                                  placeholder="/path"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Style</label>
                                <select
                                  value={btn.style}
                                  onChange={e => handleButtonChange(idx, 'style', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-sm"
                                >
                                  <option value="primary">Primary (Solid Color)</option>
                                  <option value="outline">Secondary (Outline)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'booking-links' && editingId && (
                  <BookingLinksTab propertyId={editingId} />
                )}

                {activeTab === 'calendar-sync' && editingId && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <SafeIcon icon={FiIcons.FiCalendar} className="text-blue-600 text-xl mt-0.5" />
                        <div>
                          <h4 className="font-bold text-blue-900 mb-1">Export Calendar to Airbnb/Vrbo</h4>
                          <p className="text-sm text-blue-700 mb-3">
                            Copy this URL and paste it into your Airbnb or Vrbo calendar import settings to sync your direct bookings.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={formData.icalExportToken ? `${SUPABASE_URL}/functions/v1/export-ical?token=${formData.icalExportToken}` : 'Save property first to generate export URL'}
                              className="flex-1 p-2 bg-white border border-blue-300 rounded-lg text-sm font-mono text-gray-700"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!formData.icalExportToken}
                              onClick={() => {
                                const url = `${SUPABASE_URL}/functions/v1/export-ical?token=${formData.icalExportToken}`;
                                navigator.clipboard.writeText(url);
                                alert('Export URL copied to clipboard!');
                              }}
                            >
                              <SafeIcon icon={FiIcons.FiCopy} className="mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-4">
                        <SafeIcon icon={FiIcons.FiDownload} className="text-gray-600 text-xl mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">Import from Airbnb/Vrbo</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Paste iCal URLs from your external listings to automatically block those dates on this property.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(formData.icalImportUrls || []).map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...(formData.icalImportUrls || [])];
                                newUrls[idx] = e.target.value;
                                setFormData({ ...formData, icalImportUrls: newUrls });
                              }}
                              className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="https://www.airbnb.com/calendar/ical/..."
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                const newUrls = (formData.icalImportUrls || []).filter((_, i) => i !== idx);
                                setFormData({ ...formData, icalImportUrls: newUrls });
                              }}
                            >
                              <SafeIcon icon={FiIcons.FiTrash2} />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              icalImportUrls: [...(formData.icalImportUrls || []), '']
                            });
                          }}
                        >
                          <SafeIcon icon={FiIcons.FiPlus} className="mr-1" />
                          Add Import URL
                        </Button>
                      </div>

                      {formData.icalLastSyncedAt && (
                        <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                          <SafeIcon icon={FiIcons.FiClock} />
                          Last synced: {format(new Date(formData.icalLastSyncedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <SafeIcon icon={FiIcons.FiInfo} className="text-amber-600 text-lg mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-bold mb-1">How Calendar Sync Works</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li><strong>Export:</strong> Airbnb/Vrbo will periodically fetch your export URL to see your direct bookings.</li>
                            <li><strong>Import:</strong> Our system syncs external calendars every 15 minutes to block dates.</li>
                            <li><strong>Same-day turnover:</strong> Checkout days remain available for new check-ins.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesManager;
