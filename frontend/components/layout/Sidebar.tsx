'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

interface Lesson {
  id: string
  title: string
  completed: boolean
}

interface Chapter {
  id: string
  title: string
  lessons: Lesson[]
}

interface SidebarProps {
  courseId: string
  courseTitle: string
  chapters: Chapter[]
  progress: number
}

export function Sidebar({ courseId, courseTitle, chapters, progress }: SidebarProps) {
  const pathname = usePathname()
  const [expandedChapters, setExpandedChapters] = useState<string[]>(
    chapters.map(c => c.id)
  )

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  return (
    <aside className="w-72 bg-dark-900 border-r border-dark-800 h-screen overflow-hidden flex flex-col">
      {/* Course Header */}
      <div className="p-4 border-b border-dark-800">
        <Link href={`/course/${courseId}`} className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-dark-100 truncate">{courseTitle}</h2>
            <p className="text-xs text-dark-400">{chapters.length} chapters</p>
          </div>
        </Link>
        <Progress value={progress} showLabel size="sm" />
      </div>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-2">
        {chapters.map((chapter, chapterIndex) => {
          const isExpanded = expandedChapters.includes(chapter.id)
          const completedLessons = chapter.lessons.filter(l => l.completed).length

          return (
            <div key={chapter.id} className="mb-1">
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-dark-800 text-left transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-dark-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-dark-500 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-dark-500 flex-shrink-0">
                  {chapterIndex + 1}
                </span>
                <span className="text-sm text-dark-200 truncate flex-1">{chapter.title}</span>
                <span className="text-xs text-dark-500">
                  {completedLessons}/{chapter.lessons.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 pl-4 border-l border-dark-800">
                  {chapter.lessons.map((lesson) => {
                    const lessonPath = `/course/${courseId}/${lesson.id}`
                    const isActive = pathname === lessonPath

                    return (
                      <Link
                        key={lesson.id}
                        href={lessonPath}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-primary-500/10 text-primary-500'
                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                        )}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
