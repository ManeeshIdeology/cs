import { Choices, SelectField, TextField } from './ui'

export const SERVICE_OPTIONS = [
  { value: 'Probationer', label: 'Probationer', hint: 'Currently on probation / in training' },
  { value: 'Confirmed', label: 'Confirmed', hint: 'Confirmed in service' },
]

/** The batch years offered (2026 ... 1992). An old value outside this list (e.g. a typo like 2029) is NOT kept. */
export const batchOptions = (meta) => meta.batches

/** Returns the batch if it is a valid choice, otherwise '' so the person has to pick one. */
export const validBatch = (meta, batch) => (meta.batches.includes(batch) ? batch : '')

/** Officer detail inputs shared by sign-up and profile. `err(name)` returns the error text for a field. */
export default function OfficerFields({ values, set, err, meta, withState = true }) {
  const bind = (name) => ({
    value: values[name] ?? '',
    onChange: (e) => set(name, e.target.value),
    error: err(name),
  })
  return (
    <>
      <TextField label="Designation" placeholder="e.g. District Collector" autoComplete="organization-title" {...bind('designation')} />
      <SelectField label="Batch" options={batchOptions(meta)} placeholder="Select batch" {...bind('batch')} />
      <div className="full">
        <Choices
          label="Current service status"
          name="service_status"
          value={values.service_status}
          onChange={(v) => set('service_status', v)}
          options={SERVICE_OPTIONS}
          error={err('service_status')}
        />
      </div>
      {withState && <SelectField label="State / UT" options={meta.states} {...bind('state_ut')} hint="Used to group notes in State/UT compilations." />}
      <TextField label="Current Posting" placeholder="e.g. Secretary, Revenue Dept." {...bind('current_posting')} />
      <div className="full">
        <TextField
          label="Training Institute / Academy"
          optional
          hint="Only if you are currently undergoing institutional training."
          {...bind('training_institute')}
        />
      </div>
    </>
  )
}
