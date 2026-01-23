'use client'

import { Mail, MessageCircle, FileText, ExternalLink } from 'lucide-react'

const faqs = [
  {
    question: 'How does Book2Course work?',
    answer: 'Upload a PDF book or notes, and our AI analyzes the content to create a structured course with chapters, lessons, and quizzes. The process is fully automatic.'
  },
  {
    question: 'What file formats are supported?',
    answer: 'Currently, we only support PDF files. Make sure your PDF is text-based (not scanned images) for best results.'
  },
  {
    question: 'How long does processing take?',
    answer: 'Processing time depends on the document length. Notes typically take 1-3 minutes, while full books can take 5-15 minutes.'
  },
  {
    question: 'Can I select specific chapters from a book?',
    answer: 'Yes! When you upload a book (requires Basic or Pro plan), you can select specific chapters to convert instead of the entire book.'
  },
  {
    question: 'What\'s the difference between Notes and Books?',
    answer: 'Notes are for shorter documents that are processed entirely. Books are for longer documents where you can select specific chapters to convert.'
  },
  {
    question: 'How accurate are the quizzes?',
    answer: 'Quizzes are generated based on the content of your document. They test comprehension of the key concepts covered in each lesson.'
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel anytime from the Billing page. You\'ll retain access until the end of your billing period.'
  },
  {
    question: 'What happens to my courses if I downgrade?',
    answer: 'Your existing courses remain accessible. You just won\'t be able to create new courses beyond your new plan\'s limits.'
  }
]

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Help & Support</h1>
        <p className="text-dark-400 mt-1">Get answers to common questions or contact us</p>
      </div>

      {/* Contact Options */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <a
          href="mailto:support@book2course.com"
          className="flex items-center gap-4 p-5 bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <div className="font-medium text-dark-100">Email Support</div>
            <div className="text-sm text-dark-500">support@book2course.com</div>
          </div>
        </a>

        <a
          href="https://twitter.com/book2course"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-5 bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="font-medium text-dark-100">Twitter/X</div>
              <div className="text-sm text-dark-500">@book2course</div>
            </div>
            <ExternalLink className="w-4 h-4 text-dark-500" />
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div>
        <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group bg-dark-900 border border-dark-800 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-dark-800/50 transition-colors">
                <span className="font-medium text-dark-100 pr-4">{faq.question}</span>
                <span className="text-dark-500 group-open:rotate-180 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-dark-400 border-t border-dark-800 pt-4">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
