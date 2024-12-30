import { useState, useRef, useEffect } from 'react'
import './App.css'

// Custom hook for keyboard shortcuts
function useKeyboardShortcuts({ 
  onSave, 
  onClear, 
  onToggleSidebar,
  onNavigateNotes,
  onSelectNote,
  isSidebarOpen,
  hasNotes
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Save: Cmd+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onSave?.()
      }
      // Clear: Esc
      else if (e.key === 'Escape') {
        e.preventDefault()
        if (isSidebarOpen) {
          onToggleSidebar?.()
        } else {
          onClear?.()
        }
      }
      // Toggle Sidebar: Cmd+/
      else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onToggleSidebar?.()
      }
      // Navigate notes with arrow keys when sidebar is open
      else if (isSidebarOpen && hasNotes && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        onNavigateNotes?.(e.key === 'ArrowUp' ? -1 : 1)
      }
      // Select note with Enter when sidebar is open
      else if (isSidebarOpen && hasNotes && e.key === 'Enter') {
        e.preventDefault()
        onSelectNote?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onClear, onToggleSidebar, onNavigateNotes, onSelectNote, isSidebarOpen, hasNotes])
}

function App() {
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('notes')
    return savedNotes ? JSON.parse(savedNotes) : []
  })
  const [currentNote, setCurrentNote] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [highlightedNoteIndex, setHighlightedNoteIndex] = useState(0)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [linkPopup, setLinkPopup] = useState({ show: false, x: 0, y: 0, link: null })
  const editorRef = useRef(null)
  const linkInputRef = useRef(null)

  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId)
      if (note) {
        editorRef.current.innerHTML = note.content
        setCurrentNote(editorRef.current.textContent)
      }
    }
  }, [selectedNoteId, notes])

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  const insertLink = () => {
    const selection = window.getSelection()
    if (selection.toString()) {
      const url = 'https://'
      document.execCommand('createLink', false, url)
      
      // Find the newly created link
      const range = selection.getRangeAt(0)
      const link = range.startContainer.parentElement
      if (link.tagName === 'A') {
        // Select the URL for easy editing
        const urlRange = document.createRange()
        urlRange.selectNodeContents(link)
        selection.removeAllRanges()
        selection.addRange(urlRange)
      }
    }
  }

  const insertBold = () => {
    document.execCommand('bold', false, null)
  }

  const insertItalic = () => {
    document.execCommand('italic', false, null)
  }

  const insertUnderline = () => {
    document.execCommand('underline', false, null)
  }

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault()
            insertLink()
            break
          case 'b':
            e.preventDefault()
            insertBold()
            break
          case 'i':
            e.preventDefault()
            insertItalic()
            break
          case 'u':
            e.preventDefault()
            insertUnderline()
            break
          default:
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const addNote = () => {
    const editorContent = editorRef.current.innerHTML
    if (!editorRef.current.textContent.trim()) return

    const noteData = {
      id: selectedNoteId || Date.now(),
      timestamp: new Date().toLocaleString(),
      content: editorContent,
      tags: extractTags(editorRef.current.textContent)
    }

    if (selectedNoteId) {
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNoteId ? noteData : note
        )
      )
    } else {
      setNotes(prevNotes => [...prevNotes, noteData])
    }

    clearCurrentNote()
  }

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id))
    if (selectedNoteId === id) {
      clearCurrentNote()
    }
  }

  const clearCurrentNote = () => {
    editorRef.current.innerHTML = ''
    setCurrentNote('')
    setSelectedNoteId(null)
  }

  const selectNote = (id) => {
    setSelectedNoteId(id)
  }

  const getNoteSummary = (content) => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const text = tempDiv.textContent || ''
    return text.length > 60 ? text.substring(0, 60) + '...' : text
  }

  const getFirstLine = (content) => {
    const div = document.createElement('div')
    div.innerHTML = content
    
    // Get only text nodes and links, ignore other HTML elements
    const textContent = Array.from(div.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE || 
        (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A'))
      .map(node => node.textContent)
      .join('')
      .trim()
    
    const firstLine = textContent.split('\n')[0].trim()
    return firstLine || 'Empty note'
  }

  const hasImage = (content) => {
    const div = document.createElement('div')
    div.innerHTML = content
    return div.querySelector('img') !== null
  }

  const hasVideo = (content) => {
    const div = document.createElement('div')
    div.innerHTML = content
    return div.querySelector('.youtube-card') !== null
  }

  // Reset highlighted note when sidebar closes
  useEffect(() => {
    if (!sidebarOpen) {
      setHighlightedNoteIndex(0)
    }
  }, [sidebarOpen])

  // Update highlighted note when selected note changes
  useEffect(() => {
    if (selectedNoteId) {
      const index = notes.findIndex(note => note.id === selectedNoteId)
      if (index !== -1) {
        setHighlightedNoteIndex(index)
      }
    }
  }, [selectedNoteId, notes])

  const navigateNotes = (direction) => {
    setHighlightedNoteIndex(prevIndex => {
      const newIndex = prevIndex + direction
      if (newIndex < 0) return notes.length - 1
      if (newIndex >= notes.length) return 0
      return newIndex
    })
  }

  const selectHighlightedNote = () => {
    if (notes[highlightedNoteIndex]) {
      selectNote(notes[highlightedNoteIndex].id)
    }
  }

  // Clear delete confirmation when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.delete-btn')) {
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Close link popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (linkPopup.show && !e.target.closest('.link-popup')) {
        setLinkPopup({ show: false, x: 0, y: 0, link: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [linkPopup.show])

  // Focus link input when popup opens
  useEffect(() => {
    if (linkPopup.show && linkInputRef.current) {
      linkInputRef.current.focus()
      linkInputRef.current.select()
    }
  }, [linkPopup.show])

  const handleLinkClick = (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault()
      const rect = e.target.getBoundingClientRect()
      setLinkPopup({
        show: true,
        x: rect.left,
        y: rect.bottom + 5,
        link: e.target
      })
    }
  }

  const updateLink = (newUrl) => {
    if (linkPopup.link) {
      linkPopup.link.href = newUrl
      setLinkPopup({ show: false, x: 0, y: 0, link: null })
    }
  }

  const removeLink = () => {
    if (linkPopup.link) {
      const text = linkPopup.link.textContent
      const textNode = document.createTextNode(text)
      linkPopup.link.parentNode.replaceChild(textNode, linkPopup.link)
      setLinkPopup({ show: false, x: 0, y: 0, link: null })
    }
  }

  const createLinkCard = (metadata) => {
    console.log('Creating link card with metadata:', metadata)
    const card = document.createElement('div')
    card.className = 'link-card'
    
    // Create the inner HTML with null checks and no extra whitespace
    const imageHtml = metadata.image ? 
      `<div class="link-card-image"><img src="${metadata.image}" alt="" loading="lazy" /></div>` : ''
    
    const faviconHtml = metadata.favicon ? 
      `<img src="${metadata.favicon}" alt="" class="link-card-favicon" />` : ''
    
    card.innerHTML = `<button class="link-card-close" aria-label="Remove embed"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button><a href="${metadata.url}" target="_blank" rel="noopener noreferrer">${imageHtml}<div class="link-card-content"><div class="link-card-title">${faviconHtml}<span>${metadata.title || 'Untitled'}</span></div><div class="link-card-site">${metadata.siteName || new URL(metadata.url).hostname}</div></div></a>`

    // Add close button handler
    const closeButton = card.querySelector('.link-card-close')
    closeButton.addEventListener('click', () => {
      card.remove()
    })

    return card
  }

  const createLoadingIndicator = () => {
    const loader = document.createElement('div')
    loader.className = 'loading-indicator'
    loader.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Fetching link details...</span>
    `
    return loader
  }

  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const createYouTubeEmbed = (url) => {
    const videoId = getYouTubeVideoId(url)
    if (!videoId) return null

    const container = document.createElement('div')
    container.className = 'youtube-container'
    container.contentEditable = false
    
    container.innerHTML = `
      <iframe 
        class="youtube-embed"
        src="https://www.youtube.com/embed/${videoId}?rel=0"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <button class="youtube-card-close" aria-label="Remove embed">✕</button>
    `

    // Add close button handler
    const closeButton = container.querySelector('.youtube-card-close')
    closeButton.addEventListener('click', () => {
      container.remove()
    })

    return container
  }

  const handlePaste = async (e) => {
    e.preventDefault()
    const items = e.clipboardData.items
    let pastedText = ''

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = document.createElement('img')
          img.src = event.target.result
          img.className = 'editor-image'
          
          const selection = window.getSelection()
          const range = selection.getRangeAt(0)
          range.insertNode(img)
          
          range.setStartAfter(img)
          range.setEndAfter(img)
          selection.removeAllRanges()
          selection.addRange(range)
        }
        reader.readAsDataURL(file)
      }
      else if (item.type === 'text/plain') {
        pastedText = await new Promise(resolve => item.getAsString(resolve))
        
        // Check if it's a YouTube URL
        if (getYouTubeVideoId(pastedText)) {
          const selection = window.getSelection()
          const range = selection.getRangeAt(0)
          
          const embed = createYouTubeEmbed(pastedText)
          range.deleteContents()
          range.insertNode(embed)
          
          // Add a line break after the embed
          const br = document.createElement('br')
          range.setStartAfter(embed)
          range.insertNode(br)
          range.setStartAfter(br)
          selection.removeAllRanges()
          selection.addRange(range)
          return
        }
        
        // Check if the pasted text is a URL
        const urlRegex = /https?:\/\/[^\s]+/g
        if (urlRegex.test(pastedText)) {
          const selection = window.getSelection()
          const range = selection.getRangeAt(0)
          
          // Insert temporary loading indicator
          const loader = createLoadingIndicator()
          range.deleteContents()
          range.insertNode(loader)
          
          try {
            console.log('Fetching metadata for URL:', pastedText)
            const response = await fetch('/api/fetch-metadata', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: pastedText }),
            })
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const metadata = await response.json()
            console.log('Received metadata:', metadata)
            
            // Remove loader
            loader.remove()
            
            // Insert title as link
            const link = document.createElement('a')
            link.href = pastedText
            link.textContent = metadata.title || pastedText
            range.insertNode(link)
            
            // Add a line break
            const br1 = document.createElement('br')
            range.setStartAfter(link)
            range.insertNode(br1)
            
            // Add the embed card
            const card = createLinkCard(metadata)
            range.setStartAfter(br1)
            range.insertNode(card)
            
            // Add another line break and position cursor
            const br2 = document.createElement('br')
            range.setStartAfter(card)
            range.insertNode(br2)
            range.setStartAfter(br2)
            
            // Update selection
            selection.removeAllRanges()
            selection.addRange(range)
          } catch (error) {
            console.error('Error handling URL paste:', error)
            loader.remove()
            
            // Just insert the URL as a link
            const link = document.createElement('a')
            link.href = pastedText
            link.textContent = pastedText
            range.insertNode(link)
            
            // Move cursor after the link
            range.setStartAfter(link)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        } else {
          document.execCommand('insertText', false, pastedText)
        }
      }
    }
  }

  const extractTags = (text) => {
    const tagRegex = /#(\w+)/g
    const tags = []
    let match

    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1].toLowerCase())
    }

    return [...new Set(tags)]
  }

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (editorRef.current?.textContent.trim()) {
        addNote()
      }
    },
    onClear: clearCurrentNote,
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onNavigateNotes: navigateNotes,
    onSelectNote: selectHighlightedNote,
    isSidebarOpen: sidebarOpen,
    hasNotes: notes.length > 0
  })

  return (
    <div className="app-container">
      <button 
        className={'sidebar-toggle ' + (sidebarOpen ? 'open' : '')}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label={sidebarOpen ? 'Close sidebar (⌘/)' : 'Open sidebar (⌘/)'}
        title={sidebarOpen ? 'Close sidebar (⌘/)' : 'Open sidebar (⌘/)'}
      >
        {sidebarOpen ? '←' : '→'}
      </button>

      <div className={'sidebar ' + (sidebarOpen ? 'open' : '')}>
        <div className="sidebar-notes">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className={`sidebar-note ${selectedNoteId === note.id ? 'selected' : ''}`}
              onClick={() => selectNote(note.id)}
            >
              <div className="sidebar-note-preview">
                <div className="sidebar-note-first-line">
                  {hasImage(note.content) && (
                    <svg className="image-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                  {hasVideo(note.content) && (
                    <svg className="video-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
                      <path d="M10 9l5 3-5 3z"/>
                    </svg>
                  )}
                  <span>{getFirstLine(note.content)}</span>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="sidebar-note-tags">
                    {note.tags.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="delete-note" 
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNote(note.id)
                }}
                aria-label="Delete note"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="note-input">
          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable
            onPaste={handlePaste}
            onInput={(e) => setCurrentNote(e.target.textContent)}
            onClick={handleLinkClick}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                document.execCommand('insertText', false, '  ')
              }
              else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                document.execCommand('insertLineBreak')
              }
            }}
            placeholder={`Type or paste content here. Add tags with # (e.g. #work)

Pasted URLs become readable links and embed cards. 

⌘/ to open saved notes

⌘↵ to save
`}
            role="textbox"
            aria-multiline="true"
            dangerouslySetInnerHTML={selectedNoteId ? undefined : { __html: '' }}
          />
          <div className="note-actions">
            <button onClick={addNote} className="save-btn">
              {selectedNoteId ? 'Update' : 'Save'}
            </button>
            <button onClick={clearCurrentNote} className="clear-btn">
              Clear
            </button>
          </div>
          {linkPopup.show && (
            <div 
              className="link-popup"
              style={{ 
                position: 'fixed',
                left: `${linkPopup.x}px`,
                top: `${linkPopup.y}px`
              }}
            >
              <input
                ref={linkInputRef}
                type="text"
                defaultValue={linkPopup.link?.href || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateLink(e.target.value)
                  } else if (e.key === 'Escape') {
                    setLinkPopup({ show: false, x: 0, y: 0, link: null })
                  }
                }}
                placeholder="Enter URL"
              />
              <button onClick={() => updateLink(linkInputRef.current.value)}>
                Update
              </button>
              <button onClick={removeLink} className="remove-link">
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
