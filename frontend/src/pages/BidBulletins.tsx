import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Download, Hash, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

// Mock data for bid bulletins and supplements
const mockBidBulletins = [
  {
    id: '1',
    type: 'Bid Bulletin',
    title: 'Bid Bulletin No. 1 - Supply and Delivery of Laboratory Equipment',
    referenceNo: 'WMSU-BB-2024-001',
    date: '2024-02-15',
    relatedTo: 'WMSU-PR-2024-001',
    description: 'This bulletin provides clarifications and amendments to the bidding documents for the Supply and Delivery of Laboratory Equipment for Chemistry Department.',
    changes: [
      'Extension of submission deadline to March 20, 2024',
      'Clarification on technical specifications for microscopes',
      'Updated delivery timeline requirements'
    ],
    attachments: [
      { name: 'Bid Bulletin No. 1.pdf', url: '#' },
      { name: 'Amended Technical Specifications.pdf', url: '#' }
    ],
    status: 'Active'
  },
  {
    id: '2',
    type: 'Supplemental Bid Bulletin',
    title: 'Supplemental Bid Bulletin - Renovation of Library Reading Area',
    referenceNo: 'WMSU-SBB-2024-001',
    date: '2024-02-20',
    relatedTo: 'WMSU-PR-2024-002',
    description: 'This supplemental bulletin contains important updates and modifications to the original bidding documents for the Library Reading Area Renovation project.',
    changes: [
      'Additional requirements for air conditioning system',
      'Updated material specifications',
      'Revised project timeline',
      'New safety requirements'
    ],
    attachments: [
      { name: 'Supplemental Bid Bulletin.pdf', url: '#' },
      { name: 'Updated Project Timeline.pdf', url: '#' },
      { name: 'Safety Requirements.pdf', url: '#' }
    ],
    status: 'Active'
  },
  {
    id: '3',
    type: 'Bid Bulletin',
    title: 'Bid Bulletin No. 2 - Supply of Office Supplies and Stationery',
    referenceNo: 'WMSU-BB-2024-002',
    date: '2024-02-25',
    relatedTo: 'WMSU-PR-2024-003',
    description: 'Important clarifications and updates regarding the bidding for Office Supplies and Stationery.',
    changes: [
      'Updated quantity requirements',
      'Clarification on delivery schedule',
      'Additional product specifications'
    ],
    attachments: [
      { name: 'Bid Bulletin No. 2.pdf', url: '#' },
      { name: 'Updated Quantity List.pdf', url: '#' }
    ],
    status: 'Active'
  },
  {
    id: '4',
    type: 'Supplemental Bid Bulletin',
    title: 'Supplemental Bid Bulletin - CCTV System Installation',
    referenceNo: 'WMSU-SBB-2024-002',
    date: '2024-03-01',
    relatedTo: 'WMSU-PR-2024-004',
    description: 'This supplemental bulletin provides critical updates to the CCTV System Installation project specifications and requirements.',
    changes: [
      'Increased number of cameras from 50 to 60',
      'Updated storage capacity requirements',
      'New network infrastructure specifications',
      'Extended warranty requirements'
    ],
    attachments: [
      { name: 'Supplemental Bid Bulletin.pdf', url: '#' },
      { name: 'Updated Technical Specifications.pdf', url: '#' },
      { name: 'Network Requirements.pdf', url: '#' }
    ],
    status: 'Active'
  },
  {
    id: '5',
    type: 'Bid Bulletin',
    title: 'Bid Bulletin No. 3 - Supply and Delivery of Computer Equipment',
    referenceNo: 'WMSU-BB-2024-003',
    date: '2024-03-05',
    relatedTo: 'WMSU-PR-2024-005',
    description: 'Clarifications and amendments to the Computer Equipment procurement bidding documents.',
    changes: [
      'Updated minimum system requirements',
      'Clarification on warranty terms',
      'Revised delivery schedule',
      'Additional software requirements'
    ],
    attachments: [
      { name: 'Bid Bulletin No. 3.pdf', url: '#' },
      { name: 'System Requirements.pdf', url: '#' },
      { name: 'Software Specifications.pdf', url: '#' }
    ],
    status: 'Active'
  },
  {
    id: '6',
    type: 'Notice',
    title: 'Notice of Postponement - Library Renovation Project',
    referenceNo: 'WMSU-NOTICE-2024-001',
    date: '2024-03-10',
    relatedTo: 'WMSU-PR-2024-002',
    description: 'Official notice regarding the postponement of the opening of bids for the Library Reading Area Renovation project.',
    changes: [
      'New opening date: March 25, 2024',
      'Updated submission deadline',
      'Revised schedule of activities'
    ],
    attachments: [
      { name: 'Notice of Postponement.pdf', url: '#' },
      { name: 'Revised Schedule.pdf', url: '#' }
    ],
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

function getTypeColor(type: string): string {
  if (type.toLowerCase().includes('supplemental')) {
    return 'bg-orange-100 text-orange-800';
  }
  if (type.toLowerCase().includes('notice')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-green-100 text-green-800';
}

export default function BidBulletins() {
  const navigate = useNavigate();
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('All');

  const selectedItem = mockBidBulletins.find(item => item.id === selectedBulletin);
  
  const filteredBulletins = filterType === 'All' 
    ? mockBidBulletins 
    : mockBidBulletins.filter(item => 
        filterType === 'Bulletins' 
          ? item.type.toLowerCase().includes('bid bulletin') && !item.type.toLowerCase().includes('supplemental')
          : item.type.toLowerCase().includes(filterType.toLowerCase())
      );

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
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Supplemental / Bid Bulletins</h1>
            </div>
            <p className="text-gray-600 mt-2">Access bid bulletins, supplements, and updates for ongoing procurements.</p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {['All', 'Bulletins', 'Supplemental', 'Notice'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-red-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Bulletins List */}
          <div className="space-y-4">
            {filteredBulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                onClick={() => setSelectedBulletin(bulletin.id === selectedBulletin ? null : bulletin.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(bulletin.type)}`}>
                        {bulletin.type}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {bulletin.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{bulletin.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-mono">{bulletin.referenceNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(bulletin.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span>Related to: {bulletin.relatedTo}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{bulletin.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-red-900">
                    <span className="text-sm font-medium">View Details</span>
                    <span className="transform transition-transform" style={{ transform: selectedBulletin === bulletin.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedBulletin === bulletin.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Changes & Updates
                        </h4>
                        <ul className="space-y-2">
                          {bulletin.changes.map((change, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-red-900 mt-1">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {bulletin.attachments && bulletin.attachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Attachments
                          </h4>
                          <div className="space-y-2">
                            {bulletin.attachments.map((attachment, index) => (
                              <a
                                key={index}
                                href={attachment.url}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-sm text-red-900 hover:text-red-700 hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                <span>{attachment.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredBulletins.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bulletins found for the selected filter.</p>
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

