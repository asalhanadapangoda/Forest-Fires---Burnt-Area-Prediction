import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:8000'

const PRESETS = [
  {
    name: 'Spring Rain (Low Risk)',
    icon: '🌧️',
    description: 'Damp spring day with high humidity and rain.',
    data: { X: 5, Y: 5, FFMC: 50.0, DMC: 5.0, DC: 20.0, ISI: 1.0, temp: 12.0, RH: 90, wind: 1.5, rain: 4.0, month: 'mar' }
  },
  {
    name: 'Typical Summer (Moderate)',
    icon: '☀️',
    description: 'Standard summer conditions in Portugal forest.',
    data: { X: 6, Y: 5, FFMC: 88.0, DMC: 80.0, DC: 500.0, ISI: 8.0, temp: 24.0, RH: 35, wind: 3.5, rain: 0.0, month: 'aug' }
  },
  {
    name: 'Windy Warning (High Risk)',
    icon: '⚠️',
    description: 'Hot afternoon with high winds and dry fine fuels.',
    data: { X: 7, Y: 5, FFMC: 92.0, DMC: 120.0, DC: 600.0, ISI: 14.0, temp: 28.0, RH: 25, wind: 8.2, rain: 0.0, month: 'sep' }
  },
  {
    name: 'Extreme Drought (Critical)',
    icon: '🔥',
    description: 'Extreme heatwave, absolute drought, severe risk.',
    data: { X: 8, Y: 6, FFMC: 96.0, DMC: 290.0, DC: 820.0, ISI: 20.0, temp: 33.0, RH: 15, wind: 9.0, rain: 0.0, month: 'aug' }
  }
]

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function App() {
  const [inputs, setInputs] = useState({
    X: 7,
    Y: 5,
    FFMC: 91.5,
    DMC: 108.4,
    DC: 643.0,
    ISI: 9.6,
    temp: 24.0,
    RH: 33,
    wind: 4.9,
    rain: 0.0,
    month: 'aug'
  })

  const [backendStatus, setBackendStatus] = useState('checking') // 'checking', 'online', 'offline'
  const [loading, setLoading] = useState(false)
  const [pipelineStep, setPipelineStep] = useState('idle') // 'idle', 'weather', 'classifier', 'regressor', 'done'
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Verify backend service health on load
  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`)
      if (response.data.status === 'healthy') {
        setBackendStatus('online')
      } else {
        setBackendStatus('offline')
      }
    } catch (err) {
      setBackendStatus('offline')
    }
  }

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const applyPreset = (preset) => {
    setInputs(preset.data)
    setResult(null)
    setPipelineStep('idle')
    setError(null)
  }

  const handlePredict = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      // Step 1: Feeding Weather Data
      setPipelineStep('weather')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Step 2: Classifier Analysis
      setPipelineStep('classifier')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await axios.post(`${API_BASE_URL}/predict`, inputs)
      const data = response.data
      
      // Step 3: Transition to Regressor if it spreads
      if (data.spread) {
        setPipelineStep('regressor')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      setResult(data)
      setPipelineStep('done')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to connect to the AI Service. Please check if the backend is running.')
      setPipelineStep('idle')
    } finally {
      setLoading(false)
    }
  }

  // Risk Rating Calculator for FWI metrics
  const getFfmcRisk = (ffmc) => {
    if (ffmc < 70) return { label: 'Low', color: '#10b981' }
    if (ffmc < 85) return { label: 'Moderate', color: '#f59e0b' }
    if (ffmc < 90) return { label: 'High', color: '#ef4444' }
    return { label: 'Extreme', color: '#b91c1c' }
  }

  const getDmcRisk = (dmc) => {
    if (dmc < 15) return { label: 'Low', color: '#10b981' }
    if (dmc < 40) return { label: 'Moderate', color: '#f59e0b' }
    if (dmc < 80) return { label: 'High', color: '#ef4444' }
    return { label: 'Extreme', color: '#b91c1c' }
  }

  const getDcRisk = (dc) => {
    if (dc < 100) return { label: 'Low', color: '#10b981' }
    if (dc < 300) return { label: 'Moderate', color: '#f59e0b' }
    if (dc < 600) return { label: 'High', color: '#ef4444' }
    return { label: 'Extreme', color: '#b91c1c' }
  }

  const getIsiRisk = (isi) => {
    if (isi < 3) return { label: 'Low', color: '#10b981' }
    if (isi < 8) return { label: 'Moderate', color: '#f59e0b' }
    if (isi < 15) return { label: 'High', color: '#ef4444' }
    return { label: 'Extreme', color: '#b91c1c' }
  }

  return (
    <div className="app-container">
      {/* Dashboard Top Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">🔥</div>
          <div>
            <h1>Forest Fire Predictor</h1>
            <p className="subtitle">Two-Step AI Architecture for Spread Classification and Size Estimation</p>
          </div>
        </div>
        
        {/* Backend health status badge */}
        <div className="backend-status-container">
          <span className="status-label">AI SERVICE:</span>
          {backendStatus === 'checking' && <span className="badge status-checking">Checking...</span>}
          {backendStatus === 'online' && <span className="badge status-online">● Online</span>}
          {backendStatus === 'offline' && <span className="badge status-offline">● Offline</span>}
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        
        {/* Left column: Inputs & Controls */}
        <section className="controls-column">
          
          {/* Preset scenarios config */}
          <div className="dashboard-card preset-card">
            <h3>Quick Presets</h3>
            <p className="card-desc">Populate inputs with historical weather profiles</p>
            <div className="presets-list">
              {PRESETS.map((preset, index) => (
                <button 
                  key={index}
                  className="preset-btn"
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                >
                  <span className="preset-icon">{preset.icon}</span>
                  <div className="preset-info">
                    <span className="preset-name">{preset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive grid locator (X, Y) */}
          <div className="dashboard-card spatial-card">
            <div className="card-header-flex">
              <h3>Spatial Coordinate Locator</h3>
              <span className="indicator-value">X: {inputs.X}, Y: {inputs.Y}</span>
            </div>
            <p className="card-desc">Click on the grid to position the fire center in the forest region (X: 1-9, Y: 2-9)</p>
            
            <div className="forest-grid-wrapper">
              <div className="grid-labels-x">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => <span key={x}>{x}</span>)}
              </div>
              <div className="forest-grid-row-container">
                <div className="grid-labels-y">
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(y => <span key={y}>{y}</span>)}
                </div>
                <div className="forest-grid">
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(y => (
                    <div key={y} className="grid-row">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                        const isActive = inputs.X === x && inputs.Y === y
                        return (
                          <button
                            key={x}
                            className={`grid-cell ${isActive ? 'active-cell' : ''}`}
                            onClick={() => {
                              handleInputChange('X', x)
                              handleInputChange('Y', y)
                            }}
                            title={`Coordinate X: ${x}, Y: ${y}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Meteorological Form parameters */}
          <div className="dashboard-card form-card">
            <h3>Weather Conditions</h3>
            <p className="card-desc">Atmospheric values recorded by the weather station</p>
            
            <div className="form-group-grid">
              <div className="form-item">
                <label>
                  <span>Temperature (°C)</span>
                  <input 
                    type="number" 
                    value={inputs.temp} 
                    onChange={e => handleInputChange('temp', parseFloat(e.target.value) || 0)}
                    min="-10" max="50" step="0.1"
                  />
                </label>
                <input 
                  type="range" 
                  value={inputs.temp} 
                  onChange={e => handleInputChange('temp', parseFloat(e.target.value))}
                  min="-5" max="45" step="0.5"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span>Relative Humidity (%)</span>
                  <input 
                    type="number" 
                    value={inputs.RH} 
                    onChange={e => handleInputChange('RH', parseInt(e.target.value) || 0)}
                    min="0" max="100"
                  />
                </label>
                <input 
                  type="range" 
                  value={inputs.RH} 
                  onChange={e => handleInputChange('RH', parseInt(e.target.value))}
                  min="5" max="100" step="1"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span>Wind Speed (km/h)</span>
                  <input 
                    type="number" 
                    value={inputs.wind} 
                    onChange={e => handleInputChange('wind', parseFloat(e.target.value) || 0)}
                    min="0" max="30" step="0.1"
                  />
                </label>
                <input 
                  type="range" 
                  value={inputs.wind} 
                  onChange={e => handleInputChange('wind', parseFloat(e.target.value))}
                  min="0.5" max="15" step="0.1"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span>Outside Rain (mm/m²)</span>
                  <input 
                    type="number" 
                    value={inputs.rain} 
                    onChange={e => handleInputChange('rain', parseFloat(e.target.value) || 0)}
                    min="0" max="20" step="0.1"
                  />
                </label>
                <input 
                  type="range" 
                  value={inputs.rain} 
                  onChange={e => handleInputChange('rain', parseFloat(e.target.value))}
                  min="0.0" max="8.0" step="0.1"
                  className="slider-input"
                />
              </div>
            </div>
          </div>

          {/* FWI Parameters */}
          <div className="dashboard-card form-card">
            <h3>Fire Weather Index (FWI)</h3>
            <p className="card-desc">Calculated moisture and flammability parameters of forest litter</p>
            
            <div className="form-group-grid">
              <div className="form-item">
                <label>
                  <span className="tooltip" title="Fine Fuel Moisture Code: Indicates flammability of thin forest materials.">FFMC Index</span>
                  <div className="risk-indicator-box">
                    <input 
                      type="number" 
                      value={inputs.FFMC} 
                      onChange={e => handleInputChange('FFMC', parseFloat(e.target.value) || 0)}
                      min="10" max="100" step="0.1"
                    />
                    <span className="risk-pill" style={{backgroundColor: getFfmcRisk(inputs.FFMC).color}}>
                      {getFfmcRisk(inputs.FFMC).label}
                    </span>
                  </div>
                </label>
                <input 
                  type="range" 
                  value={inputs.FFMC} 
                  onChange={e => handleInputChange('FFMC', parseFloat(e.target.value))}
                  min="18" max="98" step="0.5"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span className="tooltip" title="Duff Moisture Code: Evaluates fuel moisture content in shallow organic forest layers.">DMC Index</span>
                  <div className="risk-indicator-box">
                    <input 
                      type="number" 
                      value={inputs.DMC} 
                      onChange={e => handleInputChange('DMC', parseFloat(e.target.value) || 0)}
                      min="0" max="300" step="0.1"
                    />
                    <span className="risk-pill" style={{backgroundColor: getDmcRisk(inputs.DMC).color}}>
                      {getDmcRisk(inputs.DMC).label}
                    </span>
                  </div>
                </label>
                <input 
                  type="range" 
                  value={inputs.DMC} 
                  onChange={e => handleInputChange('DMC', parseFloat(e.target.value))}
                  min="1" max="295" step="1.0"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span className="tooltip" title="Drought Code: Measures deep soil and heavy wood organic fuel moisture conditions.">DC Index</span>
                  <div className="risk-indicator-box">
                    <input 
                      type="number" 
                      value={inputs.DC} 
                      onChange={e => handleInputChange('DC', parseFloat(e.target.value) || 0)}
                      min="0" max="900" step="0.1"
                    />
                    <span className="risk-pill" style={{backgroundColor: getDcRisk(inputs.DC).color}}>
                      {getDcRisk(inputs.DC).label}
                    </span>
                  </div>
                </label>
                <input 
                  type="range" 
                  value={inputs.DC} 
                  onChange={e => handleInputChange('DC', parseFloat(e.target.value))}
                  min="7" max="865" step="5"
                  className="slider-input"
                />
              </div>

              <div className="form-item">
                <label>
                  <span className="tooltip" title="Initial Spread Index: Represents rate of fire spread under wind influence without fuel weight factor.">ISI Index</span>
                  <div className="risk-indicator-box">
                    <input 
                      type="number" 
                      value={inputs.ISI} 
                      onChange={e => handleInputChange('ISI', parseFloat(e.target.value) || 0)}
                      min="0" max="60" step="0.1"
                    />
                    <span className="risk-pill" style={{backgroundColor: getIsiRisk(inputs.ISI).color}}>
                      {getIsiRisk(inputs.ISI).label}
                    </span>
                  </div>
                </label>
                <input 
                  type="range" 
                  value={inputs.ISI} 
                  onChange={e => handleInputChange('ISI', parseFloat(e.target.value))}
                  min="0.0" max="57.0" step="0.2"
                  className="slider-input"
                />
              </div>
            </div>
          </div>

          {/* Temporal Selection */}
          <div className="dashboard-card form-card">
            <h3>Temporal Information</h3>
            <p className="card-desc">Fire occurrence month mapping</p>
            <div className="form-item">
              <label>Select Month
                <select 
                  value={inputs.month} 
                  onChange={e => handleInputChange('month', e.target.value)}
                  className="select-input"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Predict Action Trigger */}
          <button 
            className={`predict-button ${loading ? 'btn-loading' : ''}`}
            onClick={handlePredict}
            disabled={loading || backendStatus === 'offline'}
          >
            {loading ? 'Evaluating AI Pipeline...' : 'Run Predictions Pipeline'}
          </button>
          
          {backendStatus === 'offline' && (
            <p className="warning-text">⚠️ Start the AI backend API server to enable predictions.</p>
          )}

          {error && (
            <div className="error-panel">
              <strong>Error:</strong> {error}
            </div>
          )}
        </section>

        {/* Right column: Results & Pipeline Visualizer */}
        <section className="results-column">
          
          {/* Two-step architecture visualization flow */}
          <div className="dashboard-card pipeline-card">
            <h3>AI Prediction Pipeline Flow</h3>
            <p className="card-desc">Visual trace of data executing through the Two-Step Model Pipeline</p>
            
            <div className="pipeline-flow-visualizer">
              {/* Step 1: Input Data */}
              <div className={`flow-node ${pipelineStep !== 'idle' ? 'node-active' : ''}`}>
                <div className="node-icon">📊</div>
                <div className="node-label">Weather & FWI Input</div>
                <span className="node-status">Values Configured</span>
              </div>

              {/* Connecting Line 1 */}
              <div className={`flow-connector ${['weather', 'classifier', 'regressor', 'done'].includes(pipelineStep) ? 'connector-active' : ''}`} />

              {/* Step 2: Classifier Model */}
              <div className={`flow-node ${['classifier', 'regressor', 'done'].includes(pipelineStep) ? 'node-active' : ''} ${pipelineStep === 'classifier' ? 'node-processing' : ''}`}>
                <div className="node-icon">🧠</div>
                <div className="node-label">AI Model 1</div>
                <span className="node-sublabel">Classifier: Will it spread?</span>
                <span className="node-status">
                  {pipelineStep === 'weather' && 'Awaiting Data...'}
                  {pipelineStep === 'classifier' && 'Computing Probability...'}
                  {['regressor', 'done'].includes(pipelineStep) && 'Complete'}
                  {pipelineStep === 'idle' && 'Pending'}
                </span>
              </div>

              {/* Connecting Line 2 (Dynamic outcome branches) */}
              <div className={`flow-connector-split ${['regressor', 'done'].includes(pipelineStep) ? 'connector-active' : ''}`}>
                <div className="branch-label-left">No Spread</div>
                <div className="branch-label-right">Will Spread</div>
              </div>

              {/* Step 3: Branching node */}
              <div className="pipeline-branches-container">
                {/* Safe outcome */}
                <div className={`flow-node branch-node branch-no-spread ${result && !result.spread ? 'node-active-success' : ''}`}>
                  <div className="node-icon">✅</div>
                  <div className="node-label">Contained</div>
                  <span className="node-status">0 Hectares</span>
                </div>

                {/* AI Regressor node */}
                <div className={`flow-node branch-node branch-spread ${['regressor', 'done'].includes(pipelineStep) && result?.spread ? 'node-active-danger' : ''} ${pipelineStep === 'regressor' ? 'node-processing' : ''}`}>
                  <div className="node-icon">⚙️</div>
                  <div className="node-label">AI Model 2</div>
                  <span className="node-sublabel">Regressor: Predict Size</span>
                  <span className="node-status">
                    {pipelineStep === 'regressor' && 'Calculating area...'}
                    {pipelineStep === 'done' && result?.spread && 'Complete'}
                    {!result?.spread && 'Bypassed'}
                  </span>
                </div>
              </div>

              {/* Connecting Line 3 */}
              {result?.spread && (
                <>
                  <div className={`flow-connector ${pipelineStep === 'done' ? 'connector-active' : ''}`} />
                  
                  {/* Final size output */}
                  <div className={`flow-node ${pipelineStep === 'done' ? 'node-active-result' : ''}`}>
                    <div className="node-icon">📐</div>
                    <div className="node-label">Fire Area Prediction</div>
                    <span className="node-status">{result?.area.toFixed(2)} Hectares</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Results Summary Card */}
          <div className="dashboard-card results-card">
            <h3>AI Prediction Outcome</h3>
            <p className="card-desc">Detailed results from the model pipeline execution</p>
            
            {result ? (
              <div className="results-wrapper">
                
                {/* Result header alert */}
                <div className={`result-alert-box ${result.spread ? 'alert-danger' : 'alert-success'}`}>
                  <span className="alert-icon">{result.spread ? '🚨' : '🛡️'}</span>
                  <p>{result.message}</p>
                </div>

                {/* Grid stats */}
                <div className="results-stats-grid">
                  
                  <div className="stat-card">
                    <span className="stat-title">Prediction Decision</span>
                    <span className={`stat-value ${result.spread ? 'val-danger' : 'val-success'}`}>
                      {result.spread ? 'Spread Warning' : 'Safe / Contained'}
                    </span>
                    <span className="stat-caption">Based on Model 1 Classifier</span>
                  </div>

                  <div className="stat-card">
                    <span className="stat-title">Spread Probability</span>
                    <span className="stat-value font-mono">
                      {(result.probability * 100).toFixed(1)}%
                    </span>
                    
                    {/* Visual probability gauge */}
                    <div className="progress-bar-bg">
                      <div 
                        className={`progress-bar-fill ${result.spread ? 'bar-danger' : 'bar-success'}`}
                        style={{ width: `${result.probability * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="stat-card span-2">
                    <span className="stat-title">Estimated Burned Area</span>
                    <div className="area-outcome-display">
                      <span className="area-value font-mono">
                        {result.area.toFixed(2)}
                      </span>
                      <span className="area-unit">hectares</span>
                    </div>
                    {result.spread && (
                      <span className="stat-caption text-dim">
                        Raw regression output ln(area+1): <code className="font-mono">{result.raw_area.toFixed(4)}</code>
                      </span>
                    )}
                  </div>
                </div>

                {/* Dynamic Resource Planning Suggestion */}
                <div className="resource-planning-box">
                  <h4>💡 Dispatch Recommendation</h4>
                  {result.spread ? (
                    result.area > 20 ? (
                      <p><strong>CRITICAL RISK:</strong> High probability of massive spread. Dispatch heavy machinery, multiple ground crews, and aerial water bombers immediately. Prioritize containment lines.</p>
                    ) : result.area > 5 ? (
                      <p><strong>MODERATE RISK:</strong> Spread confirmed with medium size prediction. Recommend dispatching at least two fire engines and a local ground containment crew to reinforce parameters.</p>
                    ) : (
                      <p><strong>MINOR RISK:</strong> Fire is predicted to spread but size remains small. Dispatch single local crew for control and monitoring.</p>
                    )
                  ) : (
                    <p><strong>NORMAL MONITORING:</strong> Fire is predicted to self-contain (0 hectares). Standard local fire patrol is sufficient. No emergency response reinforcement needed.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="empty-results-state">
                <div className="empty-icon">📊</div>
                <p>Configure environmental conditions and click <strong>Run Predictions Pipeline</strong> to view AI model outcomes.</p>
              </div>
            )}
          </div>

          {/* Model information card */}
          <div className="dashboard-card info-card">
            <h3>Understanding FWI Indices</h3>
            
            <div className="info-accordion">
              <details>
                <summary>🌲 FFMC (Fine Fuel Moisture Code)</summary>
                <div className="details-content">
                  Indicates the relative ease of ignition and flammability of fine forest fuels (leaves, needles, twigs). Scale is usually 0 to 101. Values above 90 represent extreme flammability.
                </div>
              </details>
              <details>
                <summary>🍂 DMC (Duff Moisture Code)</summary>
                <div className="details-content">
                  Represents fuel moisture in moderate-depth organic layers and medium woody materials. Helpful in predicting fire intensity and duration. Values above 80 are extremely critical.
                </div>
              </details>
              <details>
                <summary>🪵 DC (Drought Code)</summary>
                <div className="details-content">
                  A deep soil moisture drying index. Measures water shortage in heavy wood logs and deep organic layers, critical for deep-seated forest fires. Values above 600 represent severe drought.
                </div>
              </details>
              <details>
                <summary>💨 ISI (Initial Spread Index)</summary>
                <div className="details-content">
                  Combines the effects of wind speed and FFMC to estimate the rate of fire spread immediately after ignition. Values above 15 show extremely fast rate of spread.
                </div>
              </details>
            </div>
          </div>

        </section>
      </main>
    </div>
  )
}

export default App
