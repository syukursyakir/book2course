import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  completed: boolean
}

interface Chapter {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface ChapterListProps {
  courseId: string
  chapters: Chapter[]
}

export function ChapterList({ courseId, chapters }: ChapterListProps) {
  return (
    <div className="space-y-6">
      {chapters.map((chapter, index) => {
        const completedLessons = chapter.lessons.filter(l => l.completed).length
        const totalLessons = chapter.lessons.length
        const isChapterComplete = completedLessons === totalLessons

        return (
          <div
            key={chapter.id}
            className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden"
          >
            {/* Chapter Header */}
            <div className="p-5 border-b border-dark-800">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg font-semibold',
                    isChapterComplete
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'bg-dark-800 text-dark-400'
                  )}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-100">{chapter.title}</h3>
                  <p className="text-sm text-dark-400 mt-1">{chapter.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-dark-500">
                    <span>
                      {completedLessons}/{totalLessons} lessons complete
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lessons List */}
            <div className="divide-y divide-dark-800">
              {chapter.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/course/${courseId}/lesson/${lesson.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-dark-800/50 transition-colors"
                >
                  {lesson.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-dark-600 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      'flex-1',
                      lesson.completed ? 'text-dark-300' : 'text-dark-200'
                    )}
                  >
                    {lesson.title}
                  </span>
                  <ChevronRight className="w-5 h-5 text-dark-600" />
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
