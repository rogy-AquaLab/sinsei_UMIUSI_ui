import RosConnection from './RosConnection'

function App() {
  return (
    <>
      <RosConnection url="ws://localhost:9090"></RosConnection>
    </>
  )
}

export default App
