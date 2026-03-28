import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency, cn } from '../../lib/utils';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

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

const EventTypesManager = () => {
  const { eventTypes, addEventType, updateEventType, deleteEventType } = useStore();
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
    baseRate: 0,
    minDuration: 2,
    cooldownHours: 1,
    active: true,
    color: '#3B82F6',
    emailTemplates: {
      confirmationTemplateId: '',
      followupTemplateId: '',
      followupDaysBefore: 1
    },
    confirmationPage: defaultConfirmation
  });

  const handleOpenModal = (eventType = null) => {
    if (eventType) {
      setEditingId(eventType.id);
      const cp = eventType.confirmationPage;
      const hasConfirmation = cp && (cp.title || cp.message || cp.buttons);
      setFormData({
        ...eventType,
        emailTemplates: eventType.emailTemplates || {
          confirmationAlias: '',
          followupAlias: '',
          followupDaysBefore: 1
        },
        confirmationPage: hasConfirmation
          ? { ...defaultConfirmation, ...cp, buttons: Array.isArray(cp.buttons) ? cp.buttons : defaultConfirmation.buttons }
          : { ...defaultConfirmation }
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        baseRate: 0,
        minDuration: 2,
        cooldownHours: 1,
        active: true,
        color: '#3B82F6',
        emailTemplates: { 
          confirmationAlias: '', 
          followupAlias: '',
          followupDaysBefore: 1
        },
        confirmationPage: defaultConfirmation
      });
    }
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      baseRate: Number(formData.baseRate),
      minDuration: Number(formData.minDuration),
      cooldownHours: Number(formData.cooldownHours),
      emailTemplates: {
        ...formData.emailTemplates,
        followupDaysBefore: Number(formData.emailTemplates.followupDaysBefore)
      }
    };

    try {
      if (editingId) {
        await updateEventType({ ...dataToSave, id: editingId });
      } else {
        await addEventType(dataToSave);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to save event type.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event type?')) {
      try {
        await deleteEventType(id);
      } catch (err) {
        alert(err.message || 'Failed to delete event type.');
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
          <h1 className="text-3xl font-bold text-gray-900">Event Types</h1>
          <p className="text-gray-500 mt-1">Configure your rental packages and pricing</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <SafeIcon icon={FiIcons.FiPlus} className="mr-2" />
          Add Event Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventTypes.map((type) => (
          <div key={type.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-2" style={{ backgroundColor: type.color }} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{type.name}</h3>
                <div className={cn("w-3 h-3 rounded-full", type.active ? "bg-green-500" : "bg-gray-300")} />
              </div>
              <p className="text-gray-600 text-sm mb-6 line-clamp-2 h-10">{type.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Starting At</span>
                  <span className="font-bold text-gray-900">{formatCurrency(type.baseRate)}/hr</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Min Duration</span>
                  <span className="font-bold text-gray-900">{type.minDuration} Hours</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(type)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(type.id)}>
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
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Event Type' : 'New Event Type'}</h3>
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
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="eventTypeForm" onSubmit={handleSave} className="space-y-4">
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="block text-sm font-bold text-gray-700">Starting At Price ($)</label>
                          <div className="relative group">
                            <SafeIcon icon={FiIcons.FiInfo} className="text-gray-400 text-sm cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 leading-relaxed">
                              Display price shown to customers. Actual pricing is controlled in the Pricing tab based on days and times requested.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        </div>
                        <input
                          type="number"
                          required
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.baseRate}
                          onChange={e => setFormData({...formData, baseRate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Display Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-10 rounded cursor-pointer border border-gray-300 p-0.5"
                            value={formData.color}
                            onChange={e => setFormData({...formData, color: e.target.value})}
                          />
                          <input
                            type="text"
                            className="flex-1 p-2 border border-gray-300 rounded-lg uppercase"
                            value={formData.color}
                            onChange={e => setFormData({...formData, color: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Min Duration (Hrs)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.minDuration}
                          onChange={e => setFormData({...formData, minDuration: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cooldown (Hrs)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={formData.cooldownHours}
                          onChange={e => setFormData({...formData, cooldownHours: e.target.value})}
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
                            <p className="text-[10px] text-gray-400 mt-1">Resend template ID sent before the event</p>
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
                            <span className="text-sm text-gray-600">day(s) before the event</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            The system will automatically send the follow-up email this many days before the event date
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                       <input
                         type="checkbox"
                         id="isActive"
                         className="w-4 h-4 rounded text-primary focus:ring-primary"
                         checked={formData.active}
                         onChange={e => setFormData({...formData, active: e.target.checked})}
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

export default EventTypesManager;