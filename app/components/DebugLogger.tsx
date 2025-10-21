'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, ChevronDown, ChevronUp, Trash2, CheckCircle } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  args: any[]
}

export function DebugLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    const addLog = (level: LogEntry['level'], args: any[]) => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
      const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`
      
      const message = args
        .map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2)
            } catch {
              return String(arg)
            }
          }
          return String(arg)
        })
        .join(' ')

      setLogs(prev => [...prev, { timestamp, level, message, args }])
    }

    console.log = (...args: any[]) => {
      originalLog(...args)
      addLog('log', args)
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      addLog('error', args)
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      addLog('warn', args)
    }

    console.info = (...args: any[]) => {
      originalInfo(...args)
      addLog('info', args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [])

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isExpanded])

  const copyLogs = () => {
    const logText = logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n')
    
    navigator.clipboard.writeText(logText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-700 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '❌'
      case 'warn':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md">
      <div className="bg-gray-900/95 backdrop-blur-xl border-t-2 border-blue-500 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-bold text-white">Debug Console</h3>
            <span className="text-xs font-mono text-gray-400">({logs.length} logs)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearLogs}
              className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            <button
              onClick={copyLogs}
              className={`p-1.5 hover:bg-gray-800 rounded-md transition-colors ${
                copied ? 'bg-blue-600' : ''
              }`}
              title="Copy logs"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
              )}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400 hover:text-white" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Logs Container */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No logs yet. Start creating a pot to see logs.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 hover:bg-gray-800/50 transition-colors ${
                      log.level === 'error' ? 'bg-red-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xs flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">{log.timestamp}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </div>
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
                          {log.message}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Footer with instructions */}
        {isExpanded && logs.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50">
            <p className="text-xs text-gray-400">
              💡 Click <Copy className="w-3 h-3 inline" /> to copy all logs and share for debugging
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

