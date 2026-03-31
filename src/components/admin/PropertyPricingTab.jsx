import React, { useState } from 'react';
import { format } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY_RULE = {
  name: '',
  ruleType: 'day_of_week',
  days: [],
  dayOfWeek: null,
  specificDate: '',
  startDate: '',
  endDate: '',
  nightlyRate: 100,
  priority: 0,
};

const EMPTY_ADDON = {
  name: '',
  description: '',
  price: 50,
  type: 'flat',
  active: true,
};

const PricingRulesSection = ({ propertyId }) => {
  const { pricingRules, addPricingRule, updatePricingRule, deletePricingRule } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_RULE);

  const propertyRules = pricingRules.filter(r => r.propertyId === propertyId);

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      days: rule.days || [],
      dayOfWeek: rule.dayOfWeek,
      specificDate: rule.specificDate || '',
      startDate: rule.startDate || '',
      endDate: rule.endDate || '',
      nightlyRate: rule.nightlyRate,
      priority: rule.priority || 0,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_RULE);
  };

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort(),
    }));
  };

  const handleSave = async () => {
    if (!formData.name) { alert('Please provide a rule name'); return; }
    if (formData.ruleType === 'day_of_week' && formData.days.length === 0) { alert('Please select at least one day'); return; }
    if (formData.ruleType === 'date_override' && !formData.specificDate) { alert('Please select a specific date'); return; }
    if (formData.ruleType === 'date_range' && (!formData.startDate || !formData.endDate)) { alert('Please select both dates'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updatePricingRule(editingId, { ...formData, propertyId });
      } else {
        await addPricingRule({ ...formData, propertyId });
      }
      handleCancel();
    } catch (err) {
      alert(err.message || 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this pricing rule?')) {
      try { await deletePricingRule(id); } catch (err) { alert(err.message); }
    }
  };

  return (
    <div className="space-y-3">
      {isAdding ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <h5 className="font-bold text-gray-900 text-sm">{editingId ? 'Edit Rule' : 'New Pricing Rule'}</h5>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Rule Name *</label>
            <input
              type="text"
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekend Peak"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Rule Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'day_of_week', label: 'Day of Week' },
                { value: 'date_override', label: 'Specific Date' },
                { value: 'date_range', label: 'Date Range' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, ruleType: opt.value })}
                  className={cn(
                    'p-2 rounded-lg border-2 font-bold text-xs transition-all',
                    formData.ruleType === opt.value
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.ruleType === 'day_of_week' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Days *</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold transition-all border',
                      formData.days.includes(idx)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formData.ruleType === 'date_override' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Specific Date *</label>
              <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                value={formData.specificDate} onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })} />
            </div>
          )}

          {formData.ruleType === 'date_range' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Start Date *</label>
                <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                  value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">End Date *</label>
                <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                  value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nightly Rate ($) *</label>
              <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                value={formData.nightlyRate} onChange={(e) => setFormData({ ...formData, nightlyRate: parseFloat(e.target.value) })} min="0" step="10" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
              <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} min="0" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {editingId ? 'Update' : 'Create'} Rule
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <SafeIcon icon={FiIcons.FiPlus} />
          Add Pricing Rule
        </button>
      )}

      {propertyRules.map((rule) => (
        <div key={rule.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 truncate">{rule.name}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">P:{rule.priority || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {rule.ruleType === 'day_of_week' && rule.days?.map(d => DAYS[d].slice(0, 3)).join(', ')}
              {rule.ruleType === 'date_override' && rule.specificDate && format(new Date(rule.specificDate + 'T00:00:00'), 'MMM d, yyyy')}
              {rule.ruleType === 'date_range' && rule.startDate && `${format(new Date(rule.startDate + 'T00:00:00'), 'MMM d')} – ${format(new Date(rule.endDate + 'T00:00:00'), 'MMM d, yyyy')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className="font-bold text-sm text-primary">{formatCurrency(rule.nightlyRate)}/night</span>
            <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}><SafeIcon icon={FiIcons.FiEdit2} /></Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id)}><SafeIcon icon={FiIcons.FiTrash2} /></Button>
          </div>
        </div>
      ))}

      {propertyRules.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400 text-center py-2">No pricing rules yet. Base nightly rate applies by default.</p>
      )}
    </div>
  );
};

const AddOnsSection = ({ propertyId }) => {
  const { addOns, addAddOn, updateAddOn, deleteAddOn } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_ADDON);

  const propertyAddOns = addOns.filter(a => a.propertyIds && a.propertyIds.includes(propertyId));

  const handleEdit = (addon) => {
    setEditingId(addon.id);
    setFormData({ name: addon.name, description: addon.description, price: addon.price, type: addon.type, active: addon.active });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_ADDON);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) { alert('Please fill in all required fields'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const existing = addOns.find(a => a.id === editingId);
        const propertyIds = existing?.propertyIds || [];
        await updateAddOn(editingId, {
          ...formData,
          propertyIds: propertyIds.includes(propertyId) ? propertyIds : [...propertyIds, propertyId],
        });
      } else {
        await addAddOn({ ...formData, propertyIds: [propertyId] });
      }
      handleCancel();
    } catch (err) {
      alert(err.message || 'Failed to save add-on.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this add-on?')) {
      try { await deleteAddOn(id); } catch (err) { alert(err.message); }
    }
  };

  return (
    <div className="space-y-3">
      {isAdding ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <h5 className="font-bold text-gray-900 text-sm">{editingId ? 'Edit Add-on' : 'New Add-on'}</h5>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Name *</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Early Check-in" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
            <textarea className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm h-16"
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Price ($) *</label>
              <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} min="0" step="5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Type *</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="flat">Flat Rate</option>
                <option value="per_night">Per Night</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="addon-active-combined" className="w-4 h-4 text-primary border-gray-300 rounded"
              checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
            <label htmlFor="addon-active-combined" className="text-xs font-medium text-gray-700">Active (visible to guests)</label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {editingId ? 'Update' : 'Create'} Add-on
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <SafeIcon icon={FiIcons.FiPlus} />
          Add Add-on
        </button>
      )}

      {propertyAddOns.map((addon) => (
        <div key={addon.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 truncate">{addon.name}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0',
                addon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {addon.active ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{addon.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className="font-bold text-sm text-primary">
              {formatCurrency(addon.price)}{addon.type === 'per_night' ? '/night' : ''}
            </span>
            <Button size="sm" variant="outline" onClick={() => handleEdit(addon)}><SafeIcon icon={FiIcons.FiEdit2} /></Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(addon.id)}><SafeIcon icon={FiIcons.FiTrash2} /></Button>
          </div>
        </div>
      ))}

      {propertyAddOns.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400 text-center py-2">No add-ons configured for this property yet.</p>
      )}
    </div>
  );
};

const PropertyPricingTab = ({ propertyId }) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SafeIcon icon={FiIcons.FiDollarSign} className="text-gray-700" />
          <h4 className="font-bold text-gray-900">Pricing Rules</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Override the base nightly rate for specific days, dates, or date ranges. Higher priority wins when rules overlap.
        </p>
        <PricingRulesSection propertyId={propertyId} />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <SafeIcon icon={FiIcons.FiPackage} className="text-gray-700" />
          <h4 className="font-bold text-gray-900">Add-Ons</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Optional extras guests can select during booking (e.g., early check-in, welcome basket).
        </p>
        <AddOnsSection propertyId={propertyId} />
      </div>
    </div>
  );
};

export default PropertyPricingTab;
