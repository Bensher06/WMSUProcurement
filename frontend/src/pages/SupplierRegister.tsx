import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Create a dedicated anonymous Supabase client
// This ensures proper JWT handling and role identification
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Function to create a fresh anonymous client for each request
// This ensures no session interference
const getAnonClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    }
  });
};
import { 
  Mail, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Building2, 
  User, 
  Phone, 
  MapPin,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';

const SupplierRegister = () => {

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    contact_number: '',
    email: '',
    address: '',
    category: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      // Create a unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `suppliers/${fileName}`;

      // Upload to Supabase Storage using direct API call (anonymous)
      const formData = new FormData();
      formData.append('file', imageFile);

      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/vendor-images/${filePath}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        console.warn('Image upload failed:', await uploadResponse.text());
        return null;
      }

      // Get public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/vendor-images/${filePath}`;
      return publicUrl;
    } catch (err: any) {
      console.error('Image upload error:', err);
      // Continue without image if upload fails
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.contact_person || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        try {
          imageUrl = await uploadImage();
        } catch (imgError: any) {
          // If image upload fails, continue without image
          console.warn('Image upload failed, continuing without image:', imgError);
        }
      }

      // Create vendor profile using Supabase client (anonymous)
      // The RLS policy 'anon_can_insert_vendors' should allow this
      console.log('📤 Attempting to insert vendor using Supabase client (anonymous)...');
      
      // Create a fresh anonymous client for this request
      const anonClient = getAnonClient();
      
      const insertData = {
        name: formData.name,
        contact_person: formData.contact_person || null,
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        address: formData.address || null,
        category: formData.category || null,
        image_url: imageUrl
        // Note: status field will use database default 'Pending' if migration is run
      };
      
      console.log('📋 Insert data:', insertData);
      console.log('🔑 Using Supabase URL:', supabaseUrl);
      console.log('🔑 JWT key (first 30 chars):', supabaseAnonKey.substring(0, 30) + '...');
      
      const { data, error } = await anonClient
        .from('suppliers')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        throw error;
      }
      
      console.log('✅ Success! Vendor inserted:', data);

      const insertedVendor = data;

      // Success
      setSuccess(true);
      setFormData({
        name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        address: '',
        category: ''
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block">
            <div className="inline-flex items-center justify-center mb-4 cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src="/wmsu1.jpg" 
                alt="WMSU Logo" 
                className="w-32 h-32 rounded-full object-cover drop-shadow-lg"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-black">Western Mindanao State University</h1>
          <p className="text-black mt-2 font-semibold">WMSU-Procurement</p>
          <p className="text-black mt-1 text-sm">A Smart Research University by 2040</p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-black text-center mb-6">
            Register as Supplier
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Register your company to participate in WMSU procurement opportunities
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 text-green-700 mb-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">Registration Successful!</span>
              </div>
              <p className="text-sm text-green-700">
                Your registration has been submitted successfully. Our team will review your application and contact you soon.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Logo/Image */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Company Logo/Image
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Company Information */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">
                  Company Name <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    placeholder="Enter company name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Contact Person <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    placeholder="Full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                >
                  <option value="">Select category</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Construction">Construction</option>
                  <option value="Services">Services</option>
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Laboratory Equipment">Laboratory Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    placeholder="Enter company address"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                'Register as Supplier'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-black text-sm mt-6">
          Western Mindanao State University © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default SupplierRegister;

