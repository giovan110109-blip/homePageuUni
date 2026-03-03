export const getInitial = (name?: string): string => {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

export const getAvatarSrc = (avatar?: string, name?: string): string => {
  if (avatar) return avatar
  return generateAvatarSvg(getInitial(name))
}

export const generateAvatarSvg = (initial: string): string => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
    '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4'
  ]
  const colorIndex = initial.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bgColor}"/>
    <text x="50" y="50" dominant-baseline="central" text-anchor="middle" 
          fill="white" font-size="40" font-family="system-ui, sans-serif" font-weight="500">
      ${initial}
    </text>
  </svg>`
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const generateColoredAvatar = (initial: string, bgColor?: string): string => {
  const color = bgColor || '#6366f1'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${color}"/>
    <text x="50" y="50" dominant-baseline="central" text-anchor="middle" 
          fill="white" font-size="40" font-family="system-ui, sans-serif" font-weight="500">
      ${initial}
    </text>
  </svg>`
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
