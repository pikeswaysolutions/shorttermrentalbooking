import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn } from '../../lib/utils';

const Settings = () => {
  const { settings, updateSettings, eventTypes } = useStore();
  const [activeTab, setActiveTab] = useState('branding');
  const [formData, setFormData] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [showHowToUse, setShowHowToUse] = useState(false);

  const appUrl = window.location.origin;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: null });
  };

  const copyToClipboard = (text, linkType) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const bookingEmbedCode = `<iframe src="${appUrl}/booking" style="width:100%; height:700px; border:none; border-radius:12px; overflow:hidden;"></iframe>`;
  
  const calendarEmbedCode = `<iframe src="${appUrl}/calendar" style="width:100%; height:900px; border:none; border-radius:12px; overflow:hidden;"></iframe>`;

  const HowToUseModal = () => (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-primary to-blue-600 text-white">
          <h3 className="text-2xl font-bold">How to Use Booking Links & Embeds</h3>
          <button 
            onClick={() => setShowHowToUse(false)} 
            className="text-white/90 hover:text-white transition-colors"
          >
            <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Section 1: Direct Links */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
              <h4 className="font-bold text-xl text-gray-900">Using Direct Links on Your Website</h4>
            </div>
            <div className="ml-10 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Direct links allow you to create buttons or navigation items on your website that take users directly to specific booking flows.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiCalendar} className="text-primary" />
                  Calendar Link
                </h5>
                <p className="text-sm text-gray-700 mb-2">
                  Use this link to show an interactive calendar where users can browse dates and select one to start booking.
                </p>
                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {`${appUrl}/calendar`}
                </code>
                <div className="mt-3 text-xs text-gray-600">
                  <strong>Example HTML:</strong>
                  <pre className="bg-white border border-gray-200 p-2 rounded mt-1 overflow-x-auto">
{`<a href="${appUrl}/calendar" class="btn btn-primary">
  View Available Dates
</a>`}
                  </pre>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiTag} className="text-green-600" />
                  Event Type Links
                </h5>
                <p className="text-sm text-gray-700 mb-2">
                  Skip the event type selection and send users directly to the booking flow for a specific event type.
                </p>
                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {`${appUrl}/booking?eventType=EVENT_ID`}
                </code>
                <div className="mt-3 text-xs text-gray-600">
                  <strong>Example HTML:</strong>
                  <pre className="bg-white border border-gray-200 p-2 rounded mt-1 overflow-x-auto">
{`<a href="${appUrl}/booking?eventType=abc123" class="btn">
  Book Wedding Package
</a>`}
                  </pre>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiZap} className="text-purple-600" />
                  Combined Parameters
                </h5>
                <p className="text-sm text-gray-700 mb-2">
                  You can combine parameters to pre-select both the event type and date.
                </p>
                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {`${appUrl}/booking?eventType=EVENT_ID&date=2024-12-25`}
                </code>
                <div className="mt-3 text-xs text-gray-600">
                  <strong>Example HTML:</strong>
                  <pre className="bg-white border border-gray-200 p-2 rounded mt-1 overflow-x-auto">
{`<a href="${appUrl}/booking?eventType=abc123&date=2024-12-31" class="btn">
  Book New Year's Eve Event
</a>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* Section 2: Embed Widgets */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
              <h4 className="font-bold text-xl text-gray-900">Embedding Widgets on Your Website</h4>
            </div>
            <div className="ml-10 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Embed widgets allow you to display the booking system or calendar directly on your website without users leaving your page.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiCode} className="text-amber-600" />
                  How to Embed
                </h5>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Copy the embed code from the "Embed Code" tab</li>
                  <li>Paste it into your website's HTML where you want the widget to appear</li>
                  <li>The widget will automatically resize and display</li>
                  <li>Users can interact with it without leaving your page</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h6 className="font-bold text-gray-900 mb-2 text-sm">Booking Widget</h6>
                  <p className="text-xs text-gray-600 mb-2">Full booking wizard embedded on your page</p>
                  <div className="text-xs text-gray-500">
                    <strong>Height:</strong> 700px<br />
                    <strong>Best for:</strong> Dedicated booking page
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h6 className="font-bold text-gray-900 mb-2 text-sm">Calendar Widget</h6>
                  <p className="text-xs text-gray-600 mb-2">Interactive calendar with date selection</p>
                  <div className="text-xs text-gray-500">
                    <strong>Height:</strong> 900px<br />
                    <strong>Best for:</strong> Availability display
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* Section 3: Common Use Cases */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
              <h4 className="font-bold text-xl text-gray-900">Common Use Cases</h4>
            </div>
            <div className="ml-10 space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900 text-sm">Navigation Menu Button</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Add a "Book Now" button in your site's main navigation that links to <code className="bg-gray-200 px-1 rounded">/calendar</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900 text-sm">Service Page CTAs</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    On your "Wedding Packages" page, add a button with <code className="bg-gray-200 px-1 rounded">/booking?eventType=wedding-id</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900 text-sm">Dedicated Booking Page</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Create a page called "Book Your Event" and embed the booking widget using the iframe code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900 text-sm">Homepage Calendar Display</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Embed the calendar widget on your homepage to show availability at a glance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900 text-sm">Email Campaigns</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Include direct booking links in your email newsletters for specific events or promotions
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* Section 4: Tips */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                <SafeIcon icon={FiIcons.FiLightbulb} />
              </div>
              <h4 className="font-bold text-xl text-gray-900">Pro Tips</h4>
            </div>
            <div className="ml-10 space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <SafeIcon icon={FiIcons.FiArrowRight} className="text-primary mt-1 flex-shrink-0" />
                <p>Use descriptive button text like "Book Wedding Package" instead of generic "Book Now"</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <SafeIcon icon={FiIcons.FiArrowRight} className="text-primary mt-1 flex-shrink-0" />
                <p>Test all links after copying to ensure they work correctly</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <SafeIcon icon={FiIcons.FiArrowRight} className="text-primary mt-1 flex-shrink-0" />
                <p>For embedded widgets, ensure your website allows iframes (some platforms restrict them)</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <SafeIcon icon={FiIcons.FiArrowRight} className="text-primary mt-1 flex-shrink-0" />
                <p>You can adjust the iframe height/width in the embed code to fit your design</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <SafeIcon icon={FiIcons.FiArrowRight} className="text-primary mt-1 flex-shrink-0" />
                <p>Keep your event type links updated if you rename or delete event types</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button onClick={() => setShowHowToUse(false)}>
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {activeTab !== 'embed' && activeTab !== 'links' && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn("transition-all", isSaved ? "bg-green-600 hover:bg-green-700" : "")}
          >
            {isSaved ? (
              <>
                <SafeIcon icon={FiIcons.FiCheck} className="mr-2" />
                Saved Changes
              </>
            ) : saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {saveError && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {saveError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('branding')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
              activeTab === 'branding' 
                ? "text-primary border-b-2 border-primary bg-blue-50/50" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <SafeIcon icon={FiIcons.FiDroplet} />
            Branding
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
              activeTab === 'policies' 
                ? "text-primary border-b-2 border-primary bg-blue-50/50" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <SafeIcon icon={FiIcons.FiFileText} />
            Rental Policies
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
              activeTab === 'keys' 
                ? "text-primary border-b-2 border-primary bg-blue-50/50" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <SafeIcon icon={FiIcons.FiKey} />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
              activeTab === 'links' 
                ? "text-primary border-b-2 border-primary bg-blue-50/50" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <SafeIcon icon={FiIcons.FiLink} />
            Booking Links
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
              activeTab === 'embed' 
                ? "text-primary border-b-2 border-primary bg-blue-50/50" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <SafeIcon icon={FiIcons.FiCode} />
            Embed Code
          </button>
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'branding' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Company Logo</label>
                
                {formData.logo ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src={formData.logo} 
                        alt="Company Logo" 
                        className="h-20 max-w-xs object-contain bg-gray-50 p-3 rounded-lg border border-gray-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                          <SafeIcon icon={FiIcons.FiUpload} />
                          Replace Logo
                        </span>
                      </label>
                      <button
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                      >
                        <SafeIcon icon={FiIcons.FiTrash2} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <SafeIcon icon={FiIcons.FiUpload} className="text-3xl text-gray-400 mb-2" />
                        <p className="mb-1 text-sm font-medium text-gray-700">
                          Click to upload logo
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, SVG (max 2MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Your logo will appear in the navigation header and landing page
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g., Luxe Events"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded cursor-pointer border border-gray-300 p-0.5"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded cursor-pointer border border-gray-300 p-0.5"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100 flex gap-3">
                <SafeIcon icon={FiIcons.FiInfo} className="mt-0.5" />
                <p>These policies will be displayed to customers during the booking process. They must agree to them before submitting a request.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Booking & Payment Terms</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.rentalPolicies?.payment || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    rentalPolicies: { ...formData.rentalPolicies, payment: e.target.value } 
                  })}
                  placeholder="Enter payment terms, deposit requirements, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cancellation Policy</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.rentalPolicies?.cancellation || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    rentalPolicies: { ...formData.rentalPolicies, cancellation: e.target.value } 
                  })}
                  placeholder="Enter cancellation rules and refund policies."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Liability & Insurance</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.rentalPolicies?.liability || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    rentalPolicies: { ...formData.rentalPolicies, liability: e.target.value } 
                  })}
                  placeholder="Enter liability and insurance requirements."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Setup & Cleanup</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.rentalPolicies?.cleanup || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    rentalPolicies: { ...formData.rentalPolicies, cleanup: e.target.value } 
                  })}
                  placeholder="Enter setup and cleanup expectations."
                />
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-amber-50 text-amber-900 rounded-lg text-sm border border-amber-100 flex gap-3">
                <SafeIcon icon={FiIcons.FiAlertCircle} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold mb-1">Security Notice</p>
                  <p>API keys are sensitive credentials. Never share them publicly or commit them to version control. These keys will be used by the backend to send automated emails.</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">Resend API Key</label>
                  <a 
                    href="https://resend.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <SafeIcon icon={FiIcons.FiExternalLink} className="text-xs" />
                    Get API Key
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
                    value={formData.apiKeys?.resendApiKey || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      apiKeys: { ...formData.apiKeys, resendApiKey: e.target.value } 
                    })}
                    placeholder="re_••••••••••••••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title={showApiKey ? "Hide key" : "Show key"}
                  >
                    <SafeIcon icon={showApiKey ? FiIcons.FiEyeOff : FiIcons.FiEye} className="text-lg" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used to send booking confirmations and follow-up emails. Format: <code className="bg-gray-100 px-1 rounded">re_xxxxx</code>
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiInfo} className="text-primary" />
                  How to use your API key
                </h4>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Create a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend.com</a></li>
                  <li>Navigate to API Keys section in your Resend dashboard</li>
                  <li>Create a new API key with "Sending access" permission</li>
                  <li>Copy the key and paste it above</li>
                  <li>Configure email templates in Resend for each event type</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="p-4 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100 flex gap-3 flex-1">
                  <SafeIcon icon={FiIcons.FiInfo} className="mt-0.5 flex-shrink-0" />
                  <p>Use these direct links on your website to let customers book specific event types or view the calendar.</p>
                </div>
                <button
                  onClick={() => setShowHowToUse(true)}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md"
                >
                  <SafeIcon icon={FiIcons.FiHelpCircle} />
                  How to Use
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiCalendar} />
                  Calendar View Link
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Shows an interactive calendar where users can select a date and start booking.
                </p>
                <div className="relative group">
                  <input
                    type="text"
                    readOnly
                    value={`${appUrl}/calendar`}
                    className="w-full p-3 pr-24 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(`${appUrl}/calendar`, 'calendar')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    {copiedLink === 'calendar' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiTag} />
                  Direct Event Type Links
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  These links skip the event type selection and take users directly to the date/time picker for a specific event type.
                </p>
                <div className="space-y-3">
                  {eventTypes.filter(et => et.active).map(type => (
                    <div key={type.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{type.name}</h4>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          Starting at ${type.baseRate}/hr
                        </span>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          readOnly
                          value={`${appUrl}/booking?eventType=${type.id}`}
                          className="w-full p-2 pr-24 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(`${appUrl}/booking?eventType=${type.id}`, type.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-colors"
                        >
                          {copiedLink === type.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiIcons.FiCode} className="text-amber-600" />
                  Example HTML Button Code
                </h4>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
{`<!-- Calendar Button -->
<a href="${appUrl}/calendar" class="button">
  View Calendar
</a>

<!-- Event Type Button -->
<a href="${appUrl}/booking?eventType=EVENT_ID" class="button">
  Book Wedding
</a>`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="p-4 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100 flex gap-3 flex-1">
                  <SafeIcon icon={FiIcons.FiInfo} className="mt-0.5 flex-shrink-0" />
                  <p>Copy these embed codes to add booking widgets directly to your website pages.</p>
                </div>
                <button
                  onClick={() => setShowHowToUse(true)}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md"
                >
                  <SafeIcon icon={FiIcons.FiHelpCircle} />
                  How to Use
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Customer Booking Widget</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Public</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Embed this widget on your public website to allow customers to book events.
                </p>
                <div className="relative group">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {bookingEmbedCode}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(bookingEmbedCode, 'booking-embed')}
                    className="absolute top-2 right-2 bg-white text-gray-900 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  >
                    {copiedLink === 'booking-embed' ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Calendar Widget</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Public</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Embed an interactive calendar on your website where users can select dates and book.
                </p>
                <div className="relative group">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {calendarEmbedCode}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(calendarEmbedCode, 'calendar-embed')}
                    className="absolute top-2 right-2 bg-white text-gray-900 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  >
                    {copiedLink === 'calendar-embed' ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showHowToUse && <HowToUseModal />}
    </div>
  );
};

export default Settings;