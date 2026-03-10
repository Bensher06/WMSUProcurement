import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, Hash, MapPin, Clock, Gavel } from 'lucide-react';
import { useState } from 'react';

// Mock data for active bidding items
const mockBiddingItems = [
  {
    id: '1',
    projectTitle: 'Supply and Delivery of Laboratory Equipment for Chemistry Department',
    abc: 2500000,
    referenceNo: 'WMSU-PR-2024-001',
    closingDate: '2024-03-15',
    openingDate: '2024-03-16',
    location: 'WMSU Main Campus, Procurement Office',
    description: 'Supply and delivery of various laboratory equipment including microscopes, balances, and safety equipment for the Chemistry Department.',
    requirements: [
      'Valid business permit',
      'DTI/SEC registration',
      'Tax clearance',
      'PhilGEPS registration',
      'Technical specifications compliance'
    ],
    contactPerson: 'Ms. Maria Santos',
    contactEmail: 'procurement@wmsu.edu.ph',
    contactPhone: '(062) 991-1020',
    status: 'Active'
  },
  {
    id: '2',
    projectTitle: 'Renovation of Library Reading Area',
    abc: 1800000,
    referenceNo: 'WMSU-PR-2024-002',
    closingDate: '2024-03-20',
    openingDate: '2024-03-21',
    location: 'WMSU Main Campus, Library Building',
    description: 'Complete renovation of the main reading area including new furniture, lighting, and air conditioning system.',
    requirements: [
      'Valid business permit',
      'DTI/SEC registration',
      'Tax clearance',
      'PhilGEPS registration',
      'Previous similar project experience',
      'Valid contractor\'s license'
    ],
    contactPerson: 'Mr. Juan Dela Cruz',
    contactEmail: 'procurement@wmsu.edu.ph',
    contactPhone: '(062) 991-1020',
    status: 'Active'
  },
  {
    id: '3',
    projectTitle: 'Supply of Office Supplies and Stationery',
    abc: 850000,
    referenceNo: 'WMSU-PR-2024-003',
    closingDate: '2024-03-25',
    openingDate: '2024-03-26',
    location: 'WMSU Main Campus, Procurement Office',
    description: 'Supply of various office supplies including paper, pens, folders, and other stationery items for the entire university.',
    requirements: [
      'Valid business permit',
      'DTI/SEC registration',
      'Tax clearance',
      'PhilGEPS registration'
    ],
    contactPerson: 'Ms. Anna Garcia',
    contactEmail: 'procurement@wmsu.edu.ph',
    contactPhone: '(062) 991-1020',
    status: 'Active'
  },
  {
    id: '4',
    projectTitle: 'Installation of CCTV System for Campus Security',
    abc: 3200000,
    referenceNo: 'WMSU-PR-2024-004',
    closingDate: '2024-04-01',
    openingDate: '2024-04-02',
    location: 'WMSU Main Campus, Various Locations',
    description: 'Supply, installation, and commissioning of CCTV system with 50 cameras, monitoring equipment, and storage system.',
    requirements: [
      'Valid business permit',
      'DTI/SEC registration',
      'Tax clearance',
      'PhilGEPS registration',
      'Technical specifications compliance',
      'Previous CCTV installation experience',
      'Warranty certificate'
    ],
    contactPerson: 'Engr. Roberto Mendoza',
    contactEmail: 'procurement@wmsu.edu.ph',
    contactPhone: '(062) 991-1020',
    status: 'Active'
  },
  {
    id: '5',
    projectTitle: 'Supply and Delivery of Computer Equipment',
    abc: 4500000,
    referenceNo: 'WMSU-PR-2024-005',
    closingDate: '2024-04-05',
    openingDate: '2024-04-06',
    location: 'WMSU Main Campus, IT Department',
    description: 'Supply and delivery of desktop computers, laptops, printers, and networking equipment for various departments.',
    requirements: [
      'Valid business permit',
      'DTI/SEC registration',
      'Tax clearance',
      'PhilGEPS registration',
      'Technical specifications compliance',
      'Authorized dealer certificate'
    ],
    contactPerson: 'Mr. Carlos Reyes',
    contactEmail: 'procurement@wmsu.edu.ph',
    contactPhone: '(062) 991-1020',
    status: 'Active'
  }
];

function formatDate(dateString: string): string {
  if (!dateString?.trim()) return dateString || '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function getDaysUntilClosing(closingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closing = new Date(closingDate);
  closing.setHours(0, 0, 0, 0);
  const diff = closing.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ActiveBidding() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const selectedBidding = mockBiddingItems.find(item => item.id === selectedItem);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-gray-100 border-b border-gray-200 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
          <span className="font-bold text-gray-900 text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/landing" className="text-sm text-gray-700 hover:text-gray-900">Back to Landing</Link>
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200/80 rounded">Log in</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900 text-white">
                <Gavel className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Active Bidding Opportunities</h1>
            </div>
            <p className="text-gray-600 mt-2">Current procurement opportunities. Submit your bids before the closing date.</p>
          </div>

          {/* Bidding List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Project Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">ABC (₱)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Closing Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBiddingItems.map((item) => {
                    const daysUntil = getDaysUntilClosing(item.closingDate);
                    const isUrgent = daysUntil <= 7 && daysUntil >= 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item.id)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{item.projectTitle}</div>
                          {isUrgent && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-600 font-medium">
                              <Clock className="w-3 h-3" />
                              {daysUntil === 0 ? 'Closes today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-800 font-medium">
                          ₱{item.abc.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-mono text-gray-600">{item.referenceNo}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(item.closingDate)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedBidding && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedBidding.projectTitle}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-mono">{selectedBidding.referenceNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">₱{selectedBidding.abc.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close details"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Important Dates
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Closing Date:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedBidding.closingDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Opening Date:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedBidding.openingDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Remaining:</span>
                        <span className={`font-medium ${getDaysUntilClosing(selectedBidding.closingDate) <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                          {getDaysUntilClosing(selectedBidding.closingDate)} days
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </h3>
                    <p className="text-sm text-gray-600">{selectedBidding.location}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium text-gray-900">Contact Person:</span> {selectedBidding.contactPerson}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Email:</span>{' '}
                      <a href={`mailto:${selectedBidding.contactEmail}`} className="text-red-900 hover:underline">
                        {selectedBidding.contactEmail}
                      </a>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Phone:</span>{' '}
                      <a href={`tel:${selectedBidding.contactPhone}`} className="text-red-900 hover:underline">
                        {selectedBidding.contactPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedBidding.description}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {selectedBidding.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-red-900 mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 bg-red-950 text-red-100 text-center text-sm mt-12">
        Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

