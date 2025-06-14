import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { useWidth, explorerName, isAddressValid, typeNumberOnly, nativeCurrency, isTagValid } from '../../utils'
import { multiply } from '../../utils/calc'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState } from 'react'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import { amountFormat, fullDateAndTime, timeFromNow, shortHash } from '../../utils/format'
import { LinkTx, LinkAccount } from '../../utils/links'
import Link from 'next/link'

const RIPPLE_EPOCH_OFFSET = 946684800 // Seconds between 1970-01-01 and 2000-01-01

export default function CreateEscrow({ setSignRequest }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [error, setError] = useState('')
  const [address, setAddress] = useState(null)
  const [destinationTag, setDestinationTag] = useState(null)
  const [amount, setAmount] = useState(null)
  const [finishAfter, setFinishAfter] = useState(null)
  const [cancelAfter, setCancelAfter] = useState(null)
  const [condition, setCondition] = useState(null)
  const [sourceTag, setSourceTag] = useState(null)
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)

  const handleCreateEscrow = async () => {
    setError('')
    setTxResult(null)

    if (!address || !isAddressValid(address)) {
      setError(t('form.error.address-invalid'))
      return
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setError('Please enter a valid destination tag.')
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError('Please enter a valid source tag.')
      return
    }

    // Validate field combinations according to XRPL documentation
    // Valid combinations: FinishAfter only, FinishAfter+CancelAfter, FinishAfter+Condition,
    // FinishAfter+Condition+CancelAfter, or Condition+CancelAfter
    if (!finishAfter && !condition) {
      setError('You must specify either a finish time or a condition (or both).')
      return
    }

    if (condition && !finishAfter && !cancelAfter) {
      setError('A conditional escrow must have either a finish time or an expiration time (or both).')
      return
    }

    if (condition && condition.length % 2 !== 0) {
      setError('Condition must be a valid hexadecimal string.')
      return
    }

    if (condition && !condition.match(/^[0-9A-Fa-f]*$/)) {
      setError('Condition must contain only hexadecimal characters.')
      return
    }

    const now = Math.floor(Date.now() / 1000)

    if (finishAfter && finishAfter <= now) {
      setError('Finish time must be in the future.')
      return
    }

    if (cancelAfter && cancelAfter <= now) {
      setError('Cancel time must be in the future.')
      return
    }

    if (finishAfter && cancelAfter && cancelAfter <= finishAfter) {
      setError('Cancel time must be after finish time.')
      return
    }

    if (!agreeToSiteTerms) {
      setError('Please agree to the Terms and conditions')
      return
    }

    try {
      let escrowCreate = {
        TransactionType: 'EscrowCreate',
        Destination: address,
        Amount: multiply(amount, 1000000)
      }

      if (destinationTag) {
        escrowCreate.DestinationTag = parseInt(destinationTag)
      }

      if (finishAfter) {
        escrowCreate.FinishAfter = finishAfter - RIPPLE_EPOCH_OFFSET
      }

      if (cancelAfter) {
        escrowCreate.CancelAfter = cancelAfter - RIPPLE_EPOCH_OFFSET
      }

      if (condition && condition.trim()) {
        escrowCreate.Condition = condition.trim().toUpperCase()
      }

      if (sourceTag) {
        escrowCreate.SourceTag = parseInt(sourceTag)
      }

      setSignRequest({
        request: escrowCreate,
        callback: (result) => {
          if (result.result) {
            setTxResult({
              status: result.result.meta?.TransactionResult,
              date: result.result.date,
              destination: result.result.Destination,
              amount: amountFormat(result.result.Amount),
              destinationTag: result.result.DestinationTag,
              sourceTag: result.result.SourceTag,
              fee: amountFormat(result.result.Fee),
              sequence: result.result.Sequence,
              hash: result.result.hash,
              finishAfter: result.result.FinishAfter,
              cancelAfter: result.result.CancelAfter,
              condition: result.result.Condition,
              ledgerIndex: result.result.ledger_index,
              balanceChanges: result.result.balanceChanges
            })
          } else {
            setError('Transaction failed')
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const parseDateTimeLocal = (value) => {
    if (!value) return null
    return Math.floor(new Date(value).getTime() / 1000)
  }

  return (
    <>
      <SEO title="Create Escrow" description={'Create an escrow transaction on the ' + explorerName} />
      <div className="content-text content-center">
        <h1 className="center">Create Escrow</h1>
        <NetworkTabs />

        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder="Destination address"
            name="destination"
            hideButton={true}
            setValue={setAddress}
            rawData={isAddressValid(address) ? { address } : {}}
            type="address"
          />
          {width > 1100 && <br />}
          <FormInput
            title={t('table.destination-tag')}
            placeholder={t('form.placeholder.destination-tag')}
            setInnerValue={setDestinationTag}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={destinationTag}
          />
          {width > 1100 && <br />}
          <div className="form-input">
            <span className="input-title">{t('table.amount')}</span>
            <input
              placeholder={'Enter amount in ' + nativeCurrency}
              onChange={(e) => setAmount(e.target.value)}
              onKeyPress={typeNumberOnly}
              className="input-text"
              spellCheck="false"
              maxLength="35"
              min="0"
              type="text"
              inputMode="decimal"
              defaultValue={amount}
            />
          </div>
          {width > 1100 && <br />}
          <div className="form-input">
            <span className="input-title">
              Finish After <span className="grey">(when funds can be released)</span>
            </span>
            <input
              type="datetime-local"
              onChange={(e) => setFinishAfter(parseDateTimeLocal(e.target.value))}
              className="input-text"
              defaultValue={finishAfter ? fullDateAndTime(finishAfter, 'ripple') : ''}
            />
          </div>
          {width > 1100 && <br />}
          <div className="form-input">
            <span className="input-title">
              Cancel After <span className="grey">(when escrow expires)</span>
            </span>
            <input
              type="datetime-local"
              onChange={(e) => setCancelAfter(parseDateTimeLocal(e.target.value))}
              className="input-text"
              defaultValue={cancelAfter ? fullDateAndTime(cancelAfter, 'ripple') : ''}
            />
          </div>

          <CheckBox
            checked={showAdvanced}
            setChecked={() => {
              setShowAdvanced(!showAdvanced)
              if (!showAdvanced) {
                setCondition(null)
                setSourceTag(null)
              }
            }}
            name="advanced-escrow"
          >
            Advanced Options
          </CheckBox>

          {showAdvanced && (
            <>
              {width > 1100 && <br />}
              <div className="form-input">
                <span className="input-title">
                  Condition <span className="grey">(hex-encoded crypto-condition)</span>
                </span>
                <input
                  placeholder="Enter PREIMAGE-SHA-256 condition (optional)"
                  onChange={(e) => setCondition(e.target.value)}
                  className="input-text"
                  spellCheck="false"
                  type="text"
                  defaultValue={condition}
                />
                <div className="grey" style={{ fontSize: '12px', marginTop: '5px' }}>
                  A hex-encoded PREIMAGE-SHA-256 crypto-condition. Funds can only be released if this condition is
                  fulfilled.
                </div>
              </div>
              {width > 1100 && <br />}
              <FormInput
                title="Source Tag"
                placeholder="Enter source tag (optional)"
                setInnerValue={setSourceTag}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={sourceTag}
              />
            </>
          )}
          <br />
          <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
            I agree with the{' '}
            <Link href="/terms-and-conditions" target="_blank">
              Terms and conditions
            </Link>
            .
          </CheckBox>
          {error && (
            <>
              <br />
              <div className="red center">{error}</div>
            </>
          )}
          <br />
          <div className="center">
            <button className="button-action" onClick={handleCreateEscrow}>
              Create Escrow
            </button>
          </div>

          {txResult?.status === 'tesSUCCESS' && (
            <>
              <br />
              <div>
                <h3 className="center">Escrow Created Successfully</h3>
                <div>
                  <p>
                    <strong>{t('table.date')}:</strong> {timeFromNow(txResult.date, i18n, 'ripple')} (
                    {fullDateAndTime(txResult.date, 'ripple')})
                  </p>
                  <p>
                    <strong>{t('table.destination')}:</strong> <LinkAccount address={txResult.destination} />{' '}
                    <CopyButton text={txResult.destination} />
                  </p>
                  <p>
                    <strong>{t('table.amount')}:</strong> {txResult.amount}
                  </p>
                  {txResult.destinationTag && (
                    <p>
                      <strong>{t('table.destination-tag')}:</strong> {txResult.destinationTag}
                    </p>
                  )}
                  {txResult.sourceTag && (
                    <p>
                      <strong>Source Tag:</strong> {txResult.sourceTag}
                    </p>
                  )}
                  <p>
                    <strong>Fee:</strong> {txResult.fee}
                  </p>
                  <p>
                    <strong>{t('table.sequence')}:</strong> #{txResult.sequence}
                  </p>
                  {txResult.finishAfter && (
                    <p>
                      <strong>Finish After:</strong> {timeFromNow(txResult.finishAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.finishAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.cancelAfter && (
                    <p>
                      <strong>Cancel After:</strong> {timeFromNow(txResult.cancelAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.cancelAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.condition && (
                    <p>
                      <strong>Condition:</strong> {shortHash(txResult.condition)}{' '}
                      <CopyButton text={txResult.condition} />
                    </p>
                  )}
                  <p>
                    <strong>{t('table.hash')}: </strong>
                    <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context)
    }
  }
}
