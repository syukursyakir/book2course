import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Lightbulb, Target } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContent = any

interface LessonContentProps {
  content: {
    introduction: string
    explanation: string
    examples: AnyContent[]
    keyPoints: AnyContent[]
    summary: string
    // New enhanced fields
    key_concepts?: AnyContent[]
    common_mistakes?: AnyContent[]
    actionable_steps?: AnyContent[]
    before_you_move_on?: string[]
  }
}

// Helper to safely get text from any value (string or object)
function getTextFromValue(value: AnyContent): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object' && value !== null) {
    return value.content || value.description || value.text || value.title || JSON.stringify(value)
  }
  return String(value)
}

export function LessonContent({ content }: LessonContentProps) {
  // Helper to render an example (can be string or object)
  const renderExample = (example: AnyContent, index: number) => {
    if (typeof example === 'string') {
      return (
        <div
          key={index}
          className="bg-dark-800 border border-dark-700 rounded-lg p-4"
        >
          <p className="text-dark-300 whitespace-pre-line">{example}</p>
        </div>
      )
    }
    const title = example.title || ''
    const text = example.content || example.description || example.text || ''

    return (
      <div
        key={index}
        className="bg-dark-800 border border-dark-700 rounded-lg p-4"
      >
        {title && (
          <h4 className="text-dark-100 font-medium mb-2">{title}</h4>
        )}
        <p className="text-dark-300 whitespace-pre-line">{text}</p>
      </div>
    )
  }

  // Helper to render a key point (can be string or object)
  const renderKeyPoint = (point: AnyContent, index: number) => {
    const text = getTextFromValue(point)
    const title = typeof point === 'object' && point?.title ? point.title : null

    return (
      <li key={index} className="flex items-start gap-3">
        <span className="w-6 h-6 bg-primary-500/20 text-primary-500 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
          {index + 1}
        </span>
        <div className="text-dark-300">
          {title && <strong className="text-dark-100">{title}: </strong>}
          {typeof point === 'object' ? (point.description || point.content || point.text || '') : text}
        </div>
      </li>
    )
  }

  // Helper to render key concepts
  const renderKeyConcept = (concept: AnyContent, index: number) => {
    const term = typeof concept === 'object' ? concept.term : concept
    const definition = typeof concept === 'object' ? concept.definition : ''

    return (
      <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
        <dt className="text-dark-100 font-semibold">{term}</dt>
        {definition && <dd className="text-dark-400 mt-1">{definition}</dd>}
      </div>
    )
  }

  // Helper to render common mistakes
  const renderMistake = (item: AnyContent, index: number) => {
    const mistake = typeof item === 'object' ? item.mistake : item
    const correction = typeof item === 'object' ? item.correction : ''

    return (
      <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">{mistake}</p>
            {correction && (
              <p className="text-dark-300 mt-2">
                <span className="text-primary-500 font-medium">Instead: </span>
                {correction}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Helper to render actionable steps
  const renderActionableStep = (item: AnyContent, index: number) => {
    const step = typeof item === 'object' ? item.step : item
    const details = typeof item === 'object' ? item.details : ''

    return (
      <div key={index} className="flex items-start gap-4">
        <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-dark-100 font-medium">{step}</p>
          {details && <p className="text-dark-400 mt-1 text-sm">{details}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="prose prose-invert max-w-none">
      {/* Introduction */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-dark-100 mb-4">Introduction</h2>
        <p className="text-dark-300 leading-relaxed">{content.introduction}</p>
      </section>

      {/* Main Explanation */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-dark-100 mb-4">Explanation</h2>
        <p className="text-dark-300 leading-relaxed whitespace-pre-line">{content.explanation}</p>
      </section>

      {/* Key Concepts (new) */}
      {content.key_concepts && content.key_concepts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-500" />
            Key Concepts
          </h2>
          <dl className="space-y-4">
            {content.key_concepts.map((concept, index) => renderKeyConcept(concept, index))}
          </dl>
        </section>
      )}

      {/* Examples */}
      {content.examples && content.examples.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-4">Examples</h2>
          <div className="space-y-4">
            {content.examples.map((example, index) => renderExample(example, index))}
          </div>
        </section>
      )}

      {/* Common Mistakes (new - ENHANCE mode) */}
      {content.common_mistakes && content.common_mistakes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Common Mistakes to Avoid
          </h2>
          <div className="space-y-4">
            {content.common_mistakes.map((item, index) => renderMistake(item, index))}
          </div>
        </section>
      )}

      {/* Actionable Steps (new - ENHANCE mode) */}
      {content.actionable_steps && content.actionable_steps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            Take Action
          </h2>
          <div className="space-y-4 bg-dark-800 border border-dark-700 rounded-xl p-6">
            {content.actionable_steps.map((item, index) => renderActionableStep(item, index))}
          </div>
        </section>
      )}

      {/* Key Points */}
      {content.keyPoints && content.keyPoints.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-4">Key Takeaways</h2>
          <ul className="space-y-3">
            {content.keyPoints.map((point, index) => renderKeyPoint(point, index))}
          </ul>
        </section>
      )}

      {/* Summary */}
      <section className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-dark-100 mb-3">Summary</h2>
        <p className="text-dark-300 leading-relaxed">{content.summary}</p>
      </section>

      {/* Before You Move On (new) */}
      {content.before_you_move_on && content.before_you_move_on.length > 0 && (
        <section className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Before You Move On
          </h2>
          <ul className="space-y-3">
            {content.before_you_move_on.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-5 h-5 border-2 border-primary-500 rounded flex-shrink-0 mt-0.5" />
                <span className="text-dark-300">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
