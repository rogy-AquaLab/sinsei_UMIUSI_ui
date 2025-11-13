import { useContext } from 'react'
import { Topic, Message } from 'roslib'
import { RosContext } from './RosProvider'

const ExampleButton = () => {
  const ros = useContext(RosContext)

  const handleClick = () => {
    if (!ros) {
      console.error('ROS connection is not available.')
      return
    }

    const topic = new Topic({
      ros: ros,
      name: '/example_topic',
      messageType: 'std_msgs/String',
    })

    const message = new Message({
      data: 'Button clicked!',
    })

    topic.publish(message)
    console.log('Published button click message to /example_topic')
  }

  return <button onClick={handleClick}>Publish to /example_topic</button>
}

export default ExampleButton
