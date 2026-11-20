import { FiCalendar, FiCheck, FiChevronLeft, FiPlus, FiTag } from 'react-icons/fi'
import { NEW_TASK_TEXT, TODO_TASKS } from '../../../landing/content'
import './TodoPhone.css'

function TaskItem({ task }) {
  return (
    <li className={`todo-slot${task.isNew ? ' todo-slot--new' : ''}`}>
      <div className={`todo-task${task.done ? ' todo-task--done' : ''}`}>
        <span className='todo-task__check' aria-hidden='true'>
          {task.done && <FiCheck />}
        </span>
        <span className='todo-task__label'>{task.label}</span>
      </div>
    </li>
  )
}

function TaskGroup({ title, tasks }) {
  return (
    <div className='todo__group'>
      <p className='todo__group-title'>{title}</p>
      <ul>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  )
}

export default function TodoPhone({ className = '' }) {
  return (
    <div
      className={`phone todo-phone phone--3d${className ? ` ${className}` : ''}`}
      role='img'
      aria-label={`A to-do app on a phone. A new task, ${NEW_TASK_TEXT}, is typed and saved to the list.`}
    >
      {/* Rear thickness layers for depth illusion */}
      <div className='phone__edge phone__edge--1' aria-hidden='true' />
      <div className='phone__edge phone__edge--2' aria-hidden='true' />
      {/* Side buttons */}
      <div className='phone__btn phone__btn--power' aria-hidden='true' />
      <div className='phone__btn phone__btn--vol-up' aria-hidden='true' />
      <div className='phone__btn phone__btn--vol-dn' aria-hidden='true' />
      <div className='phone__screen'>
        {/* Glass reflection overlay */}
        <div className='phone__glass' aria-hidden='true' />
        <div className='phone__island' />
        <div className='phone__status'>
          <span>9:41</span>
          <span className='phone__status-right'>
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className='todo-list'>
          <div className='todo__header'>
            <p className='todo__date'>Tuesday</p>
            <p className='todo__title'>My Tasks</p>
            <div className='todo__progress'>
              <span className='todo__progress-bar'>
                <span className='todo__progress-fill' />
              </span>
              <span className='todo__progress-label'>
                <span>1 of 3 done</span>
                <span>1 of 4 done</span>
              </span>
            </div>
          </div>

          <TaskGroup title='Today' tasks={TODO_TASKS.today} />
          <TaskGroup title='Upcoming' tasks={TODO_TASKS.upcoming} />

          <span className='todo__fab' aria-hidden='true'>
            <FiPlus />
          </span>
        </div>

        <div className='todo-editor'>
          <div className='todo-editor__bar'>
            <span className='todo-editor__back'>
              <FiChevronLeft />
            </span>
            <span className='todo-editor__heading'>New task</span>
            <span className='todo-editor__save'>Save</span>
          </div>

          <p className='todo-editor__label'>Task</p>
          <p className='todo-editor__input'>
            <span className='todo-editor__placeholder'>What needs to be done?</span>
            <span className='todo-editor__text'>
              {NEW_TASK_TEXT.split('').map((char, i) => (
                <span className='todo-editor__char' key={i}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
              <span className='todo-editor__cursor' />
            </span>
          </p>

          <div className='todo-editor__meta'>
            <span className='todo-editor__chip'>
              <FiCalendar /> Today
            </span>
            <span className='todo-editor__chip'>
              <FiTag /> Mobile
            </span>
          </div>
        </div>

        <div className='todo-toast-wrap'>
          <span className='todo-toast'>
            Saved <FiCheck />
          </span>
        </div>
      </div>
      {/* Contact shadow */}
      <div className='phone__shadow' aria-hidden='true' />
    </div>
  )
}
