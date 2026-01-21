'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { CheckCircle2, XCircle, ChevronRight, Brain, Zap, Target, Search } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = any

interface MCQQuestion {
  type: 'mcq'
  id: string
  question: string
  options: AnyValue[]
  correctAnswer: number
  difficulty?: number
  question_type?: string
  explanation?: string
}

interface ShortAnswerQuestion {
  type: 'short_answer'
  id: string
  question: string
  sampleAnswer: string
}

type Question = MCQQuestion | ShortAnswerQuestion

interface QuizProps {
  questions: Question[]
  onComplete: (score: number, total: number) => void
}

// Helper to get text from any value
function getOptionText(option: AnyValue): string {
  if (typeof option === 'string') return option
  if (typeof option === 'object' && option !== null) {
    return option.text || option.content || option.description || option.title || JSON.stringify(option)
  }
  return String(option)
}

// Get difficulty info
function getDifficultyInfo(difficulty?: number, questionType?: string) {
  switch (difficulty) {
    case 1:
      return { label: 'Recall', icon: Brain, color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
    case 2:
      return { label: 'Understand', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    case 3:
      return { label: 'Apply', icon: Target, color: 'text-orange-400', bgColor: 'bg-orange-500/20' }
    case 4:
      return { label: 'Analyze', icon: Search, color: 'text-red-400', bgColor: 'bg-red-500/20' }
    default:
      return { label: questionType || 'Question', icon: Brain, color: 'text-dark-400', bgColor: 'bg-dark-700' }
  }
}

export function Quiz({ questions, onComplete }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [showResults, setShowResults] = useState(false)
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  const handleMCQSelect = (optionIndex: number) => {
    if (submitted[currentQuestion.id]) return
    setAnswers({ ...answers, [currentQuestion.id]: optionIndex })
  }

  const handleShortAnswerChange = (value: string) => {
    if (submitted[currentQuestion.id]) return
    setAnswers({ ...answers, [currentQuestion.id]: value })
  }

  const handleSubmitAnswer = () => {
    setSubmitted({ ...submitted, [currentQuestion.id]: true })
  }

  const handleNext = () => {
    if (isLastQuestion) {
      let correct = 0
      questions.forEach((q) => {
        if (q.type === 'mcq' && answers[q.id] === q.correctAnswer) {
          correct++
        }
      })
      setShowResults(true)
      onComplete(correct, questions.filter(q => q.type === 'mcq').length)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const isAnswered = answers[currentQuestion?.id] !== undefined
  const isSubmitted = submitted[currentQuestion?.id]

  if (showResults) {
    const mcqQuestions = questions.filter(q => q.type === 'mcq') as MCQQuestion[]
    const correct = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length
    const percentage = Math.round((correct / mcqQuestions.length) * 100)

    // Determine performance message
    let performanceMessage = ''
    let performanceColor = ''
    if (percentage >= 90) {
      performanceMessage = 'Excellent! You\'ve mastered this material.'
      performanceColor = 'text-primary-500'
    } else if (percentage >= 70) {
      performanceMessage = 'Good job! You have a solid understanding.'
      performanceColor = 'text-yellow-500'
    } else if (percentage >= 50) {
      performanceMessage = 'Keep practicing! Review the lesson content again.'
      performanceColor = 'text-orange-500'
    } else {
      performanceMessage = 'Consider reviewing the lesson before moving on.'
      performanceColor = 'text-red-500'
    }

    return (
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary-500" />
        </div>
        <h3 className="text-2xl font-bold text-dark-100 mb-2">Quiz Complete!</h3>
        <p className="text-dark-400 mb-6">
          You got {correct} out of {mcqQuestions.length} multiple choice questions correct.
        </p>
        <div className="text-4xl font-bold text-primary-500 mb-4">
          {percentage}%
        </div>
        <p className={cn('text-sm', performanceColor)}>{performanceMessage}</p>
      </div>
    )
  }

  // Get difficulty info for current question
  const difficultyInfo = currentQuestion.type === 'mcq'
    ? getDifficultyInfo((currentQuestion as MCQQuestion).difficulty, (currentQuestion as MCQQuestion).question_type)
    : null

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl">
      {/* Progress */}
      <div className="px-6 py-4 border-b border-dark-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-2">
            {difficultyInfo && currentQuestion.type === 'mcq' && (
              <span className={cn('px-2 py-1 rounded-full text-xs flex items-center gap-1', difficultyInfo.bgColor, difficultyInfo.color)}>
                <difficultyInfo.icon className="w-3 h-3" />
                {difficultyInfo.label}
              </span>
            )}
            <span className="text-dark-500">
              {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
            </span>
          </div>
        </div>
        <div className="mt-2 h-1 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-dark-100 mb-6">{currentQuestion.question}</h3>

        {currentQuestion.type === 'mcq' ? (
          <div className="space-y-3">
            {(currentQuestion as MCQQuestion).options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === index
              const isCorrect = (currentQuestion as MCQQuestion).correctAnswer === index
              const showFeedback = isSubmitted

              return (
                <button
                  key={index}
                  onClick={() => handleMCQSelect(index)}
                  disabled={isSubmitted}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-colors flex items-center gap-3',
                    !showFeedback && isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : !showFeedback
                      ? 'border-dark-700 hover:border-dark-600 bg-dark-800'
                      : showFeedback && isCorrect
                      ? 'border-primary-500 bg-primary-500/10'
                      : showFeedback && isSelected && !isCorrect
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-dark-700 bg-dark-800 opacity-50'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full border flex items-center justify-center text-sm',
                      !showFeedback && isSelected
                        ? 'border-primary-500 text-primary-500'
                        : !showFeedback
                        ? 'border-dark-600 text-dark-500'
                        : showFeedback && isCorrect
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : showFeedback && isSelected && !isCorrect
                        ? 'border-red-500 bg-red-500 text-white'
                        : 'border-dark-600 text-dark-500'
                    )}
                  >
                    {showFeedback && isCorrect ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : showFeedback && isSelected && !isCorrect ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className={cn(
                    showFeedback && isCorrect ? 'text-primary-500' :
                    showFeedback && isSelected && !isCorrect ? 'text-red-500' :
                    'text-dark-200'
                  )}>
                    {getOptionText(option)}
                  </span>
                </button>
              )
            })}

            {/* Explanation (shown after answer) */}
            {isSubmitted && (currentQuestion as MCQQuestion).explanation && (
              <div className="mt-4 p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-sm text-dark-400 mb-1 font-medium">Explanation:</p>
                <p className="text-dark-300">{(currentQuestion as MCQQuestion).explanation}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={(answers[currentQuestion.id] as string) || ''}
              onChange={(e) => handleShortAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isSubmitted}
              className="w-full h-32 bg-dark-800 border border-dark-700 rounded-lg p-4 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
            />
            {isSubmitted && (
              <div className="mt-4 p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-sm text-dark-400 mb-2">Sample Answer:</p>
                <p className="text-dark-200">{(currentQuestion as ShortAnswerQuestion).sampleAnswer}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-dark-800 flex justify-end gap-3">
        {!isSubmitted ? (
          <Button onClick={handleSubmitAnswer} disabled={!isAnswered}>
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {isLastQuestion ? 'See Results' : 'Next Question'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
