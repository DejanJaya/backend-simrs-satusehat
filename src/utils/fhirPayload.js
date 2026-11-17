/**
 * Utility Builder untuk Resource HL7 FHIR R4 Standar SATUSEHAT Kemenkes RI
 */

function buildEncounterPayload({
  encounterId,
  status = 'arrived', // arrived, in-progress, finished
  patientIhs,
  patientName,
  doctorIhs,
  doctorName,
  locationId,
  locationName,
  orgId,
  periodStart,
  periodEnd
}) {
  const payload = {
    resourceType: 'Encounter',
    status: status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory' // Rawat Jalan
    },
    subject: {
      reference: `Patient/${patientIhs}`,
      display: patientName
    },
    participant: [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'ATND',
                display: 'attender'
              }
            ]
          }
        ],
        individual: {
          reference: `Practitioner/${doctorIhs}`,
          display: doctorName
        }
      }
    ],
    period: {
      start: periodStart || new Date().toISOString(),
      ...(periodEnd ? { end: periodEnd } : {})
    },
    location: [
      {
        location: {
          reference: `Location/${locationId}`,
          display: locationName || 'Poli Rawat Jalan'
        }
      }
    ],
    serviceProvider: {
      reference: `Organization/${orgId}`
    }
  };

  if (encounterId) {
    payload.id = encounterId;
  }

  return payload;
}

function buildVitalSignObservation({
  encounterId,
  patientIhs,
  code,
  display,
  value,
  unit,
  unitCode,
  issuedDate = new Date().toISOString()
}) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: code,
          display: display
        }
      ]
    },
    subject: {
      reference: `Patient/${patientIhs}`
    },
    encounter: {
      reference: `Encounter/${encounterId}`
    },
    effectiveDateTime: issuedDate,
    valueQuantity: {
      value: Number(value),
      unit: unit,
      system: 'http://unitsofmeasure.org',
      code: unitCode
    }
  };
}

function buildBloodPressureObservation({
  encounterId,
  patientIhs,
  systolic,
  diastolic,
  issuedDate = new Date().toISOString()
}) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel with all children optional'
        }
      ]
    },
    subject: {
      reference: `Patient/${patientIhs}`
    },
    encounter: {
      reference: `Encounter/${encounterId}`
    },
    effectiveDateTime: issuedDate,
    component: [
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8480-6',
              display: 'Systolic blood pressure'
            }
          ]
        },
        valueQuantity: {
          value: Number(systolic),
          unit: 'mm[Hg]',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]'
        }
      },
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8462-4',
              display: 'Diastolic blood pressure'
            }
          ]
        },
        valueQuantity: {
          value: Number(diastolic),
          unit: 'mm[Hg]',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]'
        }
      }
    ]
  };
}

function buildConditionPayload({
  encounterId,
  patientIhs,
  icd10Code,
  icd10Display,
  recordedDate = new Date().toISOString()
}) {
  return {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed'
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: icd10Code,
          display: icd10Display
        }
      ]
    },
    subject: {
      reference: `Patient/${patientIhs}`
    },
    encounter: {
      reference: `Encounter/${encounterId}`
    },
    recordedDate: recordedDate
  };
}

function buildMedicationRequestPayload({
  encounterId,
  patientIhs,
  doctorIhs,
  kfaCode,
  medicineName,
  dosageInstruction,
  quantity,
  authoredOn = new Date().toISOString()
}) {
  return {
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
            code: 'outpatient',
            display: 'Outpatient'
          }
        ]
      }
    ],
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://sys-ids.kemkes.go.id/kfa',
          code: kfaCode || '93000123',
          display: medicineName
        }
      ]
    },
    subject: {
      reference: `Patient/${patientIhs}`
    },
    encounter: {
      reference: `Encounter/${encounterId}`
    },
    authoredOn: authoredOn,
    requester: {
      reference: `Practitioner/${doctorIhs}`
    },
    dosageInstruction: [
      {
        text: dosageInstruction || '1 tablet sehari sesudah makan'
      }
    ],
    dispenseRequest: {
      quantity: {
        value: Number(quantity),
        unit: 'TAB'
      }
    }
  };
}

function buildMedicationDispensePayload({
  encounterId,
  patientIhs,
  medicationRequestId,
  kfaCode,
  medicineName,
  quantity,
  whenHandedOver = new Date().toISOString()
}) {
  return {
    resourceType: 'MedicationDispense',
    status: 'completed',
    category: {
      coding: [
        {
          system: 'http://terminology.hl7.org/fhir/CodeSystem/medicationdispense-category',
          code: 'outpatient',
          display: 'Outpatient'
        }
      ]
    },
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://sys-ids.kemkes.go.id/kfa',
          code: kfaCode || '93000123',
          display: medicineName
        }
      ]
    },
    subject: {
      reference: `Patient/${patientIhs}`
    },
    context: {
      reference: `Encounter/${encounterId}`
    },
    authorizingPrescription: [
      {
        reference: `MedicationRequest/${medicationRequestId}`
      }
    ],
    quantity: {
      value: Number(quantity),
      unit: 'TAB'
    },
    whenHandedOver: whenHandedOver
  };
}

export {
  buildEncounterPayload,
  buildVitalSignObservation,
  buildBloodPressureObservation,
  buildConditionPayload,
  buildMedicationRequestPayload,
  buildMedicationDispensePayload
};

export default {
  buildEncounterPayload,
  buildVitalSignObservation,
  buildBloodPressureObservation,
  buildConditionPayload,
  buildMedicationRequestPayload,
  buildMedicationDispensePayload
};
