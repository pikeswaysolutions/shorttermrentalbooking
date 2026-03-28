import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';
import { set, format } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to generate 30-minute time slots
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 24 * 2; i++) {
    const minutes = i * 30;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const date = set(new Date(), { hours, minutes: mins, seconds: 0 });
    const label = format(date, 'h:mm a');
    slots.push({ value: timeString, label });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const PricingRulesManager = () => {
  const { pricingRules, addPricingRule, updatePricingRule, deletePricingRule, eventTypes } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    eventTypeId: null,
    days: [],
    startTime: '00:00',
    endTime: '23:30',
    hourlyRate: 100
  });

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      eventTypeId: rule.eventTypeId,
      days: [...rule.days],
      startTime: rule.startTime,
      endTime: rule.endTime,
      hourlyRate: rule.hourlyRate
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.days.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const ruleData = {
      ...formData,
      eventTypeId: formData.eventTypeId === '' ? null : formData.eventTypeId
    };

    setSaving(true);
    try {
      if (editingId) {
        await updatePricingRule(editingId, ruleData);
      } else {
        await addPricingRule(ruleData);
      }
      handleCancel();
    } catch (err) {
      alert(err.message || 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      eventTypeId: null,
      days: [],
      startTime: '00:00',
      endTime: '23:30',
      hourlyRate: 100
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      try {
        await deletePricingRule(id);
      } catch (err) {
        alert(err.message || 'Failed to delete rule.');
      }
    }
  };

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort()
    }));
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} icon={FiIcons.FiPlus}>
            Add Rule
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Pricing Rule' : 'New Pricing Rule'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Rule Name *</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekend Peak"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Applies To</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.eventTypeId || ''}
                onChange={(e) => setFormData({ ...formData, eventTypeId: e.target.value || null })}
              >
                <option value="">All Event Types</option>
                {eventTypes.map(et => (
                  <option key={et.id} value={et.id}>{et.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Days of Week *</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-bold transition-all border",
                      formData.days.includes(idx)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Start Time *</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={`start-${slot.value}`} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">End Time *</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={`end-${slot.value}`} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Hourly Rate ($) *</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                min="0"
                step="10"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSave}>
              {editingId ? 'Update Rule' : 'Create Rule'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pricingRules.map((rule) => (
          <div key={rule.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-gray-900">{rule.name}</h3>
                {rule.eventTypeId && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    {eventTypes.find(et => et.id === rule.eventTypeId)?.name || 'Unknown Type'}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <SafeIcon icon={FiIcons.FiCalendar} className="inline mr-1" />
                  {rule.days.map(d => DAYS[d].slice(0, 3)).join(', ')}
                </p>
                <p>
                  <SafeIcon icon={FiIcons.FiClock} className="inline mr-1" />
                  {TIME_SLOTS.find(t => t.value === rule.startTime)?.label || rule.startTime} - {TIME_SLOTS.find(t => t.value === rule.endTime)?.label || rule.endTime}
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4 ml-4">
              <span className="text-xl font-bold text-primary">{formatCurrency(rule.hourlyRate)}/hr</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>
                  <SafeIcon icon={FiIcons.FiEdit2} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id)}>
                  <SafeIcon icon={FiIcons.FiTrash2} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {pricingRules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <SafeIcon icon={FiIcons.FiDollarSign} className="mx-auto text-4xl text-gray-300 mb-2" />
            <p className="text-gray-500">No pricing rules created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingRulesManager;