package ma.elearning.user;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findLockedById(@Param("id") Long id);

    long countByRoleAndStatut(Role role, AccountStatus statut);
    long countByRoleAndStatutNot(Role role, AccountStatus statut);
    long countByStatut(AccountStatus statut);

    @Query("""
            select u from User u
            where (:query is null or lower(u.nom) like lower(concat('%', :query, '%'))
                   or lower(u.email) like lower(concat('%', :query, '%')))
              and (:role is null or u.role = :role)
              and (:status is null or u.statut = :status)
              and (:createdFrom is null or u.createdAt >= :createdFrom)
              and (:createdTo is null or u.createdAt < :createdTo)
            """)
    Page<User> searchAdmin(@Param("query") String query, @Param("role") Role role,
                           @Param("status") AccountStatus status,
                           @Param("createdFrom") Instant createdFrom,
                           @Param("createdTo") Instant createdTo, Pageable pageable);

    interface GroupCount { String getLabel(); long getTotal(); }
    interface MonthlyCount { int getYearValue(); int getMonthValue(); long getTotal(); }

    @Query("select cast(u.role as string) as label, count(u) as total from User u where u.statut <> ma.elearning.user.AccountStatus.SUPPRIME group by u.role")
    List<GroupCount> countByRoleGroup();

    @Query("""
            select year(u.createdAt) as yearValue, month(u.createdAt) as monthValue, count(u) as total
            from User u where u.createdAt >= :fromDate and u.createdAt < :toDate
            group by year(u.createdAt), month(u.createdAt)
            """)
    List<MonthlyCount> countCreatedMonthly(@Param("fromDate") Instant fromDate,
                                           @Param("toDate") Instant toDate);
}
