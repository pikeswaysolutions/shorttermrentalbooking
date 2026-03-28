import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';

const AddOnsManager = () => {
  const { addOns, addAddOn, updateAddOn, deleteAddOn, properties } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 50,
    type: 'flat',
    active: true,
    property_ids: []
  });

  const handleEdit = (addon) => {
    setEditingId(addon.id);
    setFormData({
      ...addon,
      property_ids: addon.property_ids || []
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAddOn(editingId, formData);
      } else {
        await addAddOn(formData);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', description: '', price: 50, type: 'flat', active: true, property_ids: [] });
    } catch (err) {
      alert(err.message || 'Failed to save add-on.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this add-on?')) {
      try {
        await deleteAddOn(id);
      } catch (err) {
        alert(err.message || 'Failed to delete add-on.');
      }
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: 50, type: 'flat', active: true, property_ids: [] });
  };

  const togglePropertyId = (propertyId) => {
    setFormData(prev => ({
      ...prev,
      property_ids: prev.property_ids.includes(propertyId)
        ? prev.property_ids.filter(id => id !== propertyId)
        : [...prev.property_ids, propertyId]
    }));
  };

  const getPropertyNames = (propertyIds) => {
    if (!propertyIds || propertyIds.length === 0) return 'All Properties';
    return propertyIds
      .map(id => properties.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add-ons</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} icon={FiIcons.FiPlus}>
            Add New
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Add-on' : 'New Add-on'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Add-on Name *</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Projector & Screen"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 h-20"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this add-on"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Price ($) *</label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  min="0"
                  step="5"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Pricing Type *</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="flat">Flat Rate</option>
                  <option value="per_night">Per Night</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Available for Properties
                <span className="ml-2 text-xs font-normal text-gray-500">(Leave all unchecked for all types)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {properties.filter(p => p.is_active).map(property => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => togglePropertyId(property.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors",
                      formData.property_ids.includes(property.id)
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                      formData.property_ids.includes(property.id)
                        ? "bg-primary border-primary"
                        : "border-gray-400 bg-white"
                    )}>
                      {formData.property_ids.includes(property.id) && (
                        <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{property.name}</p>
                      <p className="text-xs text-gray-500">Starting at {formatCurrency(property.base_nightly_rate)}/night</p>
                    </div>
                  </button>
                ))}
              </div>
              {formData.property_ids.length === 0 && (
                <p className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                  <SafeIcon icon={FiIcons.FiInfo} className="inline mr-1" />
                  This add-on will be available for all properties
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active-addon"
                className="w-4 h-4 text-primary border-gray-300 rounded"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <label htmlFor="active-addon" className="text-sm font-medium text-gray-700">Active (visible to customers)</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Create'} Add-on
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {addOns.map((addon) => (
          <div key={addon.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">{addon.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-bold uppercase",
                    addon.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {addon.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="font-medium">Price: <span className="text-primary font-bold">{formatCurrency(addon.price)}</span></span>
                  <span className="font-medium">Type: <span className="text-gray-900 font-bold">{addon.type === 'flat' ? 'Flat Rate' : 'Per Night'}</span></span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <SafeIcon icon={FiIcons.FiTag} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600">
                    <span className="font-semibold">Available for:</span> {getPropertyNames(addon.property_ids)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(addon)}>
                  <SafeIcon icon={FiIcons.FiEdit2} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(addon.id)}>
                  <SafeIcon icon={FiIcons.FiTrash2} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {addOns.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <SafeIcon icon={FiIcons.FiPackage} className="mx-auto text-4xl text-gray-300 mb-2" />
            <p className="text-gray-500">No add-ons created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddOnsManager;