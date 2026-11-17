import React from 'react';

const ExpandedMemberRow = ({ member, colSpan }) => {
  if (!member) return null;

  return (
    <tr className="expanded-row-details">
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div className="expanded-panel-content">
          <div className="expanded-detail-grid">
            
            <div>
              <h4 className="expanded-detail-label accent-text mb-2">Role</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{member.position || 'Recruit'}</div>
            </div>

            <div>
              <h4 className="expanded-detail-label accent-text mb-2">Medical Status</h4>
              <div style={{ fontSize: '1.25rem' }}>{member.is_revivable ? 'Revivable' : <span className="text-muted">Do Not Resuscitate</span>}</div>
              <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>Setting: {member.revive_setting || 'Unknown'}</div>
              <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>Early Discharge: {member.has_early_discharge ? 'Yes' : 'No'}</div>
            </div>

            <div>
              <h4 className="expanded-detail-label accent-text mb-2">Activity Flags</h4>
              <div style={{ fontSize: '1.25rem' }}>Organized Crime: {member.is_in_oc ? <span style={{color: 'var(--accent-primary)'}}>Participating</span> : 'No'}</div>
              <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>On Wall: {member.is_on_wall ? 'Yes' : 'No'}</div>
            </div>

          </div>
        </div>
      </td>
    </tr>
  );
};

export default ExpandedMemberRow;
