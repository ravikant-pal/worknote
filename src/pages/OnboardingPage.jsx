import KeyIcon from '@mui/icons-material/Key';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  Box,
  Button,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useIdentityStore from '../stores/useIdentityStore';

const STEPS = ['Your name', 'Your keys'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createIdentity } = useIdentityStore();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (step === 0) {
      if (!displayName.trim()) {
        setError('Please enter a display name');
        return;
      }
      setError('');
      setStep(1);
      return;
    }
    // step 1 — create identity
    setLoading(true);
    try {
      await createIdentity(displayName.trim());
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{ borderRadius: 4, p: 4, maxWidth: 420, width: '100%' }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component='img'
            src={`${import.meta.env.BASE_URL}worknote-app-icon.svg`}
            alt='WorkNote'
            sx={{ width: 50, height: 50 }}
          />
          <Typography variant='h2'>Welcome to WorkNote</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            A decentralized note-sharing app
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        {step === 0 && (
          <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              What should others call you? You can change this later.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size='small'
              label='Display name'
              placeholder='e.g. Alice'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              InputProps={{
                startAdornment: (
                  <PersonIcon
                    sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }}
                  />
                ),
              }}
            />
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Alert
              severity='info'
              icon={<KeyIcon />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              WorkNote will generate a cryptographic keypair for you. Your
              <strong> private key</strong> never leaves your device and is
              stored locally. Back it up from your profile page.
            </Alert>
            <Typography variant='body2' color='text.secondary'>
              Your identity on the Nostr network is tied to this keypair. Anyone
              you share notes with will see your display name
              <strong> "{displayName}"</strong>.
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity='error' sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          {step > 0 && (
            <Button onClick={() => setStep((s) => s - 1)} disabled={loading}>
              Back
            </Button>
          )}
          <Button
            variant='contained'
            onClick={handleNext}
            loading={loading}
            sx={{ ml: 'auto' }}
          >
            {step === STEPS.length - 1 ? 'Get started' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
