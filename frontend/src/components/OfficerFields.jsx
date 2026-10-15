import { SelectField, Segmented, TextField } from './ui'

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
      <TextField label="Batch" placeholder="e.g. 2019" {...bind('batch')} />
      <div className="full">
        <Segmented
          label="Current service status"
          name="service_status"
          value={values.service_status}
          onChange={(v) => set('service_status', v)}
          options={meta.service_statuses}
          error={err('service_status')}
        />
      </div>
      {withState && <SelectField label="State / UT" options={meta.states} {...bind('state_ut')} hint="Used to group notes when State/UT compilations are prepared." />}
      <TextField label="Current Posting" placeholder="e.g. Secretary, Dept. of Revenue" {...bind('current_posting')} />
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
